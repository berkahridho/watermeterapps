/**
 * Optimized Sync Manager - Focused on Meter Readings Only
 * Admin functions are online-only, offline sync is only for field meter readings
 */

import { supabase } from './supabase';
import { offlineStorage } from './offlineStorage';

export interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  errors: string[];
}

export class OptimizedSyncManager {
  private isOnline: boolean = false;
  private syncInProgress: boolean = false;

  constructor() {
    // Only initialize in browser environment
    if (typeof window !== 'undefined') {
      this.isOnline = navigator.onLine;
      
      // Listen for online/offline events
      window.addEventListener('online', () => {
        this.isOnline = true;
        console.log('📶 Back online - starting meter reading sync');
        this.syncMeterReadings();
      });

      window.addEventListener('offline', () => {
        this.isOnline = false;
        console.log('📵 Gone offline - meter readings will be stored locally');
      });
    }
  }

  /**
   * Check if we're online and can sync
   */
  get canSync(): boolean {
    return this.isOnline && !this.syncInProgress;
  }

  /**
   * Sync only meter readings (core offline functionality)
   */
  async syncMeterReadings(): Promise<SyncResult> {
    if (!this.canSync) {
      return { success: false, synced: 0, failed: 0, errors: ['Sync not available'] };
    }

    this.syncInProgress = true;
    const result: SyncResult = { success: true, synced: 0, failed: 0, errors: [] };

    try {
      // Get only meter reading sync items
      const syncQueue = offlineStorage.getSyncQueue().filter(item => item.type === 'reading');
      
      if (syncQueue.length === 0) {
        console.log('✅ No meter readings to sync');
        return result;
      }

      console.log(`🔄 Syncing ${syncQueue.length} meter readings...`);

      for (const item of syncQueue) {
        try {
          await this.syncMeterReading(item.data);
          offlineStorage.removeSyncItem(item.id);
          result.synced++;
          console.log(`✅ Synced meter reading: ${item.data.reading} m³`);
        } catch (error: any) {
          result.failed++;
          result.errors.push(`Reading sync failed: ${error.message}`);
          console.error('❌ Failed to sync meter reading:', error);
        }
      }

      // Download latest data after successful sync
      if (result.synced > 0) {
        await this.downloadLatestData();
      }

      result.success = result.failed === 0;
      console.log(`🎯 Sync complete: ${result.synced} synced, ${result.failed} failed`);
      
    } catch (error: any) {
      result.success = false;
      result.errors.push(error.message);
      console.error('❌ Sync process failed:', error);
    } finally {
      this.syncInProgress = false;
    }

    return result;
  }

  /**
   * Sync individual meter reading
   */
  private async syncMeterReading(reading: any): Promise<void> {
    const { error } = await supabase
      .from('meter_readings')
      .upsert({
        id: reading.id.startsWith('offline_') ? undefined : reading.id,
        customer_id: reading.customer_id,
        reading: reading.reading,
        date: reading.date,
        created_at: reading.created_at,
      });

    if (error) {
      throw error;
    }
  }

  /**
   * Download latest customers and readings for offline use
   */
  async downloadLatestData(): Promise<void> {
    try {
      console.log('📥 Downloading latest data for offline use...');

      // Download customers
      const { data: customers, error: customersError } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

      if (customersError) {
        console.warn('⚠️ Could not download customers:', customersError);
      } else if (customers) {
        offlineStorage.saveCustomers(customers.map(c => ({
          id: c.id.toString(),
          name: c.name,
          rt: c.rt,
          phone: c.phone
        })));
        console.log(`✅ Downloaded ${customers.length} customers`);
      }

      // Download recent meter readings (last 3 months for usage calculations)
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      const { data: readings, error: readingsError } = await supabase
        .from('meter_readings')
        .select('*')
        .gte('date', threeMonthsAgo.toISOString())
        .order('date', { ascending: false });

      if (readingsError) {
        console.warn('⚠️ Could not download readings:', readingsError);
      } else if (readings) {
        offlineStorage.saveReadings(readings.map(r => ({
          id: r.id.toString(),
          customer_id: r.customer_id.toString(),
          reading: r.reading,
          date: r.date
        })));
        console.log(`✅ Downloaded ${readings.length} recent readings`);
      }

    } catch (error) {
      console.error('❌ Error downloading data:', error);
    }
  }

  /**
   * Get sync status for UI
   */
  getSyncStatus(): {
    isOnline: boolean;
    pendingReadings: number;
    canSync: boolean;
    syncInProgress: boolean;
  } {
    const pendingReadings = offlineStorage.getSyncQueue()
      .filter(item => item.type === 'reading').length;

    return {
      isOnline: this.isOnline,
      pendingReadings,
      canSync: this.canSync,
      syncInProgress: this.syncInProgress
    };
  }

  /**
   * Manual sync trigger
   */
  async manualSync(): Promise<SyncResult> {
    console.log('🔄 Manual sync triggered');
    return await this.syncMeterReadings();
  }

  /**
   * Auto sync every 5 minutes when online
   */
  startAutoSync(): void {
    setInterval(async () => {
      if (this.canSync) {
        const status = this.getSyncStatus();
        if (status.pendingReadings > 0) {
          console.log('🔄 Auto-sync: Found pending readings, syncing...');
          await this.syncMeterReadings();
        }
      }
    }, 5 * 60 * 1000); // 5 minutes
  }

  /**
   * Check Supabase connection
   */
  async checkConnection(): Promise<{ connected: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('customers')
        .select('id')
        .limit(1);

      if (error) {
        return { connected: false, error: error.message };
      }

      return { connected: true };
    } catch (error: any) {
      return { connected: false, error: error.message };
    }
  }
}

// Export singleton instance
export const optimizedSyncManager = new OptimizedSyncManager();