/**
 * Sync Manager for Online/Offline Data Synchronization
 * Handles background sync when network becomes available
 */

import { supabase } from './supabase';
import { offlineStorage, OfflineReading, OfflineCustomer, OfflineDiscount } from './offlineStorage';
import { Customer, MeterReading, CustomerDiscount } from '@/types/types';

export interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  errors: string[];
}

class SyncManager {
  private isOnline: boolean = false;
  private syncInProgress: boolean = false;
  private syncCallbacks: ((result: SyncResult) => void)[] = [];
  private initialized: boolean = false;

  constructor() {
    // Initialize only on client side
    if (typeof window !== 'undefined') {
      this.initialize();
    }
  }

  private initialize() {
    if (this.initialized) return;
    
    this.isOnline = navigator.onLine;
    this.initialized = true;

    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.autoSync();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });

    // Auto-sync on page load if online
    if (this.isOnline) {
      setTimeout(() => this.autoSync(), 1000);
    }
  }

  // Check if device is online
  getOnlineStatus(): boolean {
    if (typeof window === 'undefined') return false;
    if (!this.initialized) this.initialize();
    return this.isOnline && navigator.onLine;
  }

  // Add sync callback
  onSyncComplete(callback: (result: SyncResult) => void): void {
    this.syncCallbacks.push(callback);
  }

  // Remove sync callback
  removeSyncCallback(callback: (result: SyncResult) => void): void {
    this.syncCallbacks = this.syncCallbacks.filter(cb => cb !== callback);
  }

  // Manual sync trigger
  async sync(): Promise<SyncResult> {
    if (typeof window === 'undefined') {
      return { success: false, synced: 0, failed: 0, errors: ['Not available on server side'] };
    }
    
    if (!this.initialized) this.initialize();
    
    if (this.syncInProgress) {
      return { success: false, synced: 0, failed: 0, errors: ['Sync already in progress'] };
    }

    if (!this.getOnlineStatus()) {
      return { success: false, synced: 0, failed: 0, errors: ['Device is offline'] };
    }

    this.syncInProgress = true;
    const result: SyncResult = { success: true, synced: 0, failed: 0, errors: [] };

    try {
      // First, download latest data from server
      await this.downloadServerData();

      // Then, upload pending local changes
      const syncQueue = offlineStorage.getSyncQueue();
      console.log(`Starting sync of ${syncQueue.length} items`);
      
      for (const item of syncQueue) {
        try {
          console.log(`Syncing ${item.type} with ID ${item.id}`);
          
          if (item.type === 'customer') {
            await this.syncCustomer(item.data);
          } else if (item.type === 'reading') {
            await this.syncReading(item.data);
          } else if (item.type === 'discount') {
            try {
              await this.syncDiscount(item.data);
            } catch (error: any) {
              // For discount sync failures, check if it's a table not found error
              if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
                console.warn('Discount table not found, removing from sync queue');
                // Remove from sync queue since table doesn't exist
                offlineStorage.removeSyncItem(item.id);
                result.synced++;
                continue;
              }
              throw error; // Re-throw other errors
            }
          }
          
          // Remove from sync queue after successful sync
          offlineStorage.removeSyncItem(item.id);
          result.synced++;
          console.log(`Successfully synced ${item.type} with ID ${item.id}`);
        } catch (error: any) {
          console.error(`Failed to sync ${item.type} with ID ${item.id}:`, error);
          result.failed++;
          result.errors.push(`Failed to sync ${item.type}: ${error.message}`);
          
          // Increment attempt counter
          item.attempts = (item.attempts || 0) + 1;
          
          // Remove items that have failed too many times
          if (item.attempts >= 3) {
            offlineStorage.removeSyncItem(item.id);
            result.errors.push(`Removed ${item.type} after 3 failed attempts`);
            console.log(`Removed ${item.type} with ID ${item.id} after 3 failed attempts`);
          } else {
            // Update the item in the sync queue with the new attempt count
            const queue = offlineStorage.getSyncQueue();
            const itemIndex = queue.findIndex(q => q.id === item.id);
            if (itemIndex !== -1) {
              queue[itemIndex] = item;
              localStorage.setItem('sync_queue', JSON.stringify(queue));
            }
          }
        }
      }

      // Update last sync time
      offlineStorage.setLastSyncTime(new Date().toISOString());
      
      result.success = result.failed === 0;
      console.log(`Sync completed: ${result.synced} synced, ${result.failed} failed`);
    } catch (error: any) {
      console.error('Sync failed:', error);
      result.success = false;
      result.errors.push(`Sync failed: ${error.message}`);
    } finally {
      this.syncInProgress = false;
    }

    // Notify callbacks
    this.syncCallbacks.forEach(callback => callback(result));
    
    return result;
  }

  // Auto sync (silent)
  private async autoSync(): Promise<void> {
    try {
      await this.sync();
    } catch (error) {
      console.error('Auto-sync failed:', error);
    }
  }

  // Download latest data from server
  private async downloadServerData(): Promise<void> {
    try {
      console.log('Starting server data download...');
      
      // Test connection first
      const { data: testData, error: testError } = await supabase
        .from('customers')
        .select('count')
        .limit(1);
      
      if (testError) {
        console.error('Supabase connection test failed:', testError);
        // If tables don't exist, that's okay - we'll work in offline mode
        if (testError.code === 'PGRST116' || testError.message?.includes('does not exist')) {
          console.log('Database tables not found - working in offline mode');
          return;
        }
        throw testError;
      }
      
      console.log('Supabase connection successful');

      // Download customers
      const { data: customers, error: customersError } = await supabase
        .from('customers')
        .select('*')
        .order('name', { ascending: true });

      if (customersError) {
        console.error('Error downloading customers:', customersError);
        if (customersError.code !== 'PGRST116') { // Not a "table doesn't exist" error
          throw customersError;
        }
      }

      if (customers && customers.length > 0) {
        offlineStorage.saveCustomers(customers.map((row: any) => ({
          id: row.id.toString(),
          name: row.name,
          rt: row.rt,
          phone: row.phone,
        })));
      }

      // Download recent readings (last 3 months)
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      const { data: readings, error: readingsError } = await supabase
        .from('meter_readings')
        .select('*')
        .gte('date', threeMonthsAgo.toISOString())
        .order('date', { ascending: false });

      if (readingsError) {
        console.error('Error downloading readings:', readingsError);
        if (readingsError.code !== 'PGRST116') { // Not a "table doesn't exist" error
          throw readingsError;
        }
      }

      if (readings && readings.length > 0) {
        console.log(`Downloaded ${readings.length} readings from server`);
        offlineStorage.saveReadings(readings.map((row: any) => ({
          id: row.id.toString(),
          customer_id: row.customer_id.toString(),
          reading: row.reading,
          date: row.date,
        })));
      }

      // Download discounts
      const { data: discounts, error: discountsError } = await supabase
        .from('customer_discounts')
        .select('*')
        .order('created_at', { ascending: false });

      if (discountsError) {
        // If table doesn't exist, that's okay - we'll work without server discounts
        if (discountsError.code === 'PGRST116' || discountsError.message?.includes('does not exist')) {
          console.warn('Customer discounts table not found - working without server discounts');
        } else {
          console.warn('Non-critical discount sync error, continuing without server discounts:', discountsError);
        }
      } else if (discounts && discounts.length > 0) {
        console.log(`Downloaded ${discounts.length} discounts from server`);
        offlineStorage.saveDiscounts(discounts.map((row: any) => ({
          id: row.id.toString(),
          customer_id: row.customer_id.toString(),
          discount_percentage: row.discount_percentage,
          discount_amount: row.discount_amount,
          reason: row.reason,
          discount_month: row.discount_month,
          created_by: row.created_by,
          created_at: row.created_at,
          is_active: row.is_active,
        })));
      }
      
      console.log('Server data download completed successfully');
    } catch (error) {
      console.error('Failed to download server data:', error);
      // Don't throw the error - allow offline mode to continue
      // throw error;
    }
  }

  // Sync individual customer
  private async syncCustomer(customer: OfflineCustomer): Promise<void> {
    try {
      const { error } = await supabase
        .from('customers')
        .upsert({
          id: customer.id.startsWith('offline_') ? undefined : customer.id,
          name: customer.name,
          rt: customer.rt,
          phone: customer.phone,
        });

      if (error) {
        console.error('Supabase error syncing customer:', error);
        throw error;
      }
      
      console.log(`Successfully synced customer: ${customer.name}`);
    } catch (error) {
      console.error('Error syncing customer:', error);
      throw error;
    }
  }

  // Sync individual reading
  private async syncReading(reading: OfflineReading): Promise<void> {
    try {
      const { error } = await supabase
        .from('meter_readings')
        .upsert({
          id: reading.id.startsWith('offline_') ? undefined : reading.id,
          customer_id: reading.customer_id,
          reading: reading.reading,
          date: reading.date,
        });

      if (error) {
        console.error('Supabase error syncing reading:', error);
        throw error;
      }
      
      console.log(`Successfully synced reading: ${reading.reading} m³ for customer ${reading.customer_id}`);
    } catch (error) {
      console.error('Error syncing reading:', error);
      throw error;
    }
  }

  // Sync individual discount
  private async syncDiscount(discount: OfflineDiscount): Promise<void> {
    try {
      console.log('Attempting to sync discount:', {
        id: discount.id,
        customer_id: discount.customer_id,
        discount_percentage: discount.discount_percentage,
        discount_amount: discount.discount_amount,
        discount_month: discount.discount_month
      });

      // Validate discount data before syncing
      if (!discount.customer_id) {
        console.warn('Invalid discount: missing customer_id, skipping sync');
        return;
      }
      
      if (!discount.discount_month) {
        console.warn('Invalid discount: missing discount_month, skipping sync');
        return;
      }
      
      if (!discount.reason) {
        console.warn('Invalid discount: missing reason, skipping sync');
        return;
      }
      
      // Ensure either percentage or amount is set
      if ((!discount.discount_percentage || discount.discount_percentage <= 0) && 
          (!discount.discount_amount || discount.discount_amount <= 0)) {
        console.warn('Invalid discount: neither percentage nor amount is set, skipping sync');
        return;
      }

      const { error } = await supabase
        .from('customer_discounts')
        .upsert({
          id: discount.id.startsWith('offline_') ? undefined : discount.id,
          customer_id: discount.customer_id,
          discount_percentage: discount.discount_percentage || 0,
          discount_amount: discount.discount_amount || 0,
          reason: discount.reason,
          discount_month: discount.discount_month,
          created_by: discount.created_by || 'admin',
          created_at: discount.created_at,
          is_active: discount.is_active !== false, // Default to true if undefined
        });

      if (error) {
        console.error('Supabase error syncing discount:', {
          error: error,
          errorString: JSON.stringify(error),
          code: error?.code,
          message: error?.message,
          details: error?.details,
          hint: error?.hint,
          discountData: {
            id: discount.id,
            customer_id: discount.customer_id,
            discount_percentage: discount.discount_percentage,
            discount_amount: discount.discount_amount,
            discount_month: discount.discount_month,
            reason: discount.reason
          }
        });
        
        // If table doesn't exist, that's a non-critical error for now
        if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
          console.warn('Customer discounts table does not exist, skipping discount sync');
          return; // Don't throw, just skip
        }
        
        // If it's a foreign key constraint error, it might be that the customer doesn't exist
        if (error.code === '23503' || error.message?.includes('foreign key')) {
          console.warn(`Customer ${discount.customer_id} does not exist in database, skipping discount sync`);
          return; // Don't throw, just skip
        }
        
        // If it's a unique constraint violation, the discount already exists
        if (error.code === '23505' || error.message?.includes('unique')) {
          console.warn(`Discount already exists for customer ${discount.customer_id} in month ${discount.discount_month}, skipping`);
          return; // Don't throw, just skip
        }
        
        throw error;
      }
      
      console.log(`Successfully synced discount: ${discount.discount_percentage || discount.discount_amount}${discount.discount_percentage ? '%' : ' IDR'} for customer ${discount.customer_id}`);
    } catch (error) {
      console.error('Error syncing discount:', {
        error,
        discountId: discount.id,
        customerId: discount.customer_id
      });
      throw error;
    }
  }

  // Check if Supabase is properly configured and accessible
  async checkSupabaseConnection(): Promise<{ connected: boolean; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('count')
        .limit(1);
      
      if (error) {
        if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
          return { connected: false, error: 'Database tables not found - working in offline mode' };
        }
        return { connected: false, error: error.message };
      }
      
      return { connected: true };
    } catch (error: any) {
      return { connected: false, error: error.message || 'Connection failed' };
    }
  }

  // Force download fresh data (for manual refresh)
  async refreshData(): Promise<void> {
    if (typeof window === 'undefined') {
      throw new Error('Not available on server side');
    }
    
    if (!this.getOnlineStatus()) {
      throw new Error('Device is offline');
    }

    await this.downloadServerData();
  }

  // Get sync status
  getSyncStatus(): {
    isOnline: boolean;
    syncInProgress: boolean;
    pendingItems: number;
    lastSync: string | null;
  } {
    if (typeof window === 'undefined') {
      return {
        isOnline: false,
        syncInProgress: false,
        pendingItems: 0,
        lastSync: null,
      };
    }
    
    if (!this.initialized) this.initialize();
    
    return {
      isOnline: this.getOnlineStatus(),
      syncInProgress: this.syncInProgress,
      pendingItems: offlineStorage.getSyncQueue().length,
      lastSync: offlineStorage.getLastSyncTime(),
    };
  }
}

export const syncManager = new SyncManager();