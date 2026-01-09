/**
 * Offline Storage Manager for Water Meter App
 * Handles local data storage and synchronization
 */

import { Customer, MeterReading, CustomerDiscount } from '@/types/types';

export interface OfflineReading {
  id: string;
  customer_id: string;
  reading: number;
  date: string;
  created_at: string;
  synced: boolean;
  customer_name?: string;
  customer_rt?: string;
}

export interface OfflineCustomer extends Customer {
  synced: boolean;
  last_updated: string;
}

export interface OfflineDiscount extends CustomerDiscount {
  synced: boolean;
  last_updated: string;
}

class OfflineStorageManager {
  private readonly CUSTOMERS_KEY = 'offline_customers';
  private readonly READINGS_KEY = 'offline_readings';
  private readonly DISCOUNTS_KEY = 'offline_discounts';
  private readonly SYNC_QUEUE_KEY = 'sync_queue';
  private readonly LAST_SYNC_KEY = 'last_sync';

  // Customer Management
  saveCustomers(customers: Customer[]): void {
    const offlineCustomers: OfflineCustomer[] = customers.map(customer => ({
      ...customer,
      synced: true,
      last_updated: new Date().toISOString()
    }));
    localStorage.setItem(this.CUSTOMERS_KEY, JSON.stringify(offlineCustomers));
  }

  getCustomers(): OfflineCustomer[] {
    const stored = localStorage.getItem(this.CUSTOMERS_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  addCustomer(customer: Customer, skipSync: boolean = false): void {
    const customers = this.getCustomers();
    const offlineCustomer: OfflineCustomer = {
      ...customer,
      synced: false,
      last_updated: new Date().toISOString()
    };
    customers.push(offlineCustomer);
    localStorage.setItem(this.CUSTOMERS_KEY, JSON.stringify(customers));
    
    // Only add to sync queue if not skipping sync (for mock data)
    if (!skipSync) {
      this.addToSyncQueue('customer', offlineCustomer);
    }
  }

  // Reading Management
  saveReadings(readings: MeterReading[]): void {
    const offlineReadings: OfflineReading[] = readings.map(reading => ({
      ...reading,
      synced: true,
      created_at: reading.date
    }));
    localStorage.setItem(this.READINGS_KEY, JSON.stringify(offlineReadings));
  }

  getReadings(): OfflineReading[] {
    const stored = localStorage.getItem(this.READINGS_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  addReading(reading: Omit<MeterReading, 'id'>, customerName?: string, customerRt?: string, skipSync: boolean = false): string {
    const readings = this.getReadings();
    const offlineReading: OfflineReading = {
      ...reading,
      id: this.generateId(),
      synced: false,
      created_at: new Date().toISOString(),
      customer_name: customerName,
      customer_rt: customerRt
    };
    readings.push(offlineReading);
    localStorage.setItem(this.READINGS_KEY, JSON.stringify(readings));
    
    // Only add to sync queue if not skipping sync (for mock data)
    if (!skipSync) {
      this.addToSyncQueue('reading', offlineReading);
    }
    
    return offlineReading.id;
  }

  updateReading(id: string, updates: Partial<OfflineReading>): boolean {
    const readings = this.getReadings();
    const index = readings.findIndex(r => r.id === id);
    if (index === -1) return false;

    // Preserve the synced flag if it's being explicitly set to true
    const newReading = { ...readings[index], ...updates };
    readings[index] = newReading;
    localStorage.setItem(this.READINGS_KEY, JSON.stringify(readings));
    
    // Only add to sync queue if not already synced
    if (!newReading.synced) {
      this.addToSyncQueue('reading', newReading);
    }
    return true;
  }

  // Get readings for a specific customer
  getCustomerReadings(customerId: string): OfflineReading[] {
    return this.getReadings().filter(r => r.customer_id === customerId);
  }

  // Check for duplicate readings in the same month
  checkDuplicateReading(customerId: string, date: string, excludeId?: string): boolean {
    const readingDate = new Date(date);
    const year = readingDate.getFullYear();
    const month = readingDate.getMonth();
    
    const readings = this.getReadings().filter(r => {
      if (excludeId && r.id === excludeId) return false;
      if (r.customer_id !== customerId) return false;
      
      const rDate = new Date(r.date);
      return rDate.getFullYear() === year && rDate.getMonth() === month;
    });
    
    return readings.length > 0;
  }

  // Get previous reading for validation
  getPreviousReading(customerId: string, date: string): OfflineReading | null {
    const readings = this.getCustomerReadings(customerId)
      .filter(r => new Date(r.date) < new Date(date))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    console.log(`getPreviousReading for customer ${customerId}: found ${readings.length} readings before ${date}`);
    if (readings.length > 0) {
      console.log(`Previous reading:`, readings[0]);
    }
    
    return readings.length > 0 ? readings[0] : null;
  }

  // Calculate 5-month average usage
  calculateFiveMonthAverage(customerId: string, currentDate: string): number | null {
    const readings = this.getCustomerReadings(customerId)
      .filter(r => new Date(r.date) < new Date(currentDate))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 6); // Get last 6 readings to calculate 5 usage periods

    console.log(`calculateFiveMonthAverage for customer ${customerId}: found ${readings.length} readings`);

    if (readings.length < 2) {
      console.log(`Not enough readings for average calculation (need at least 2, have ${readings.length})`);
      return null;
    }

    const usages: number[] = [];
    for (let i = 0; i < readings.length - 1; i++) {
      const usage = readings[i].reading - readings[i + 1].reading;
      if (usage >= 0) {
        usages.push(usage);
        console.log(`Usage period ${i + 1}: ${usage} m³ (${readings[i].reading} - ${readings[i + 1].reading})`);
      }
    }

    const average = usages.length > 0 ? usages.reduce((sum, usage) => sum + usage, 0) / usages.length : null;
    console.log(`Calculated 5-month average: ${average} m³ from ${usages.length} usage periods`);
    
    return average;
  }

  // Discount Management
  saveDiscounts(discounts: CustomerDiscount[]): void {
    const offlineDiscounts: OfflineDiscount[] = discounts.map(discount => ({
      ...discount,
      synced: true,
      last_updated: new Date().toISOString()
    }));
    localStorage.setItem(this.DISCOUNTS_KEY, JSON.stringify(offlineDiscounts));
  }

  getDiscounts(): OfflineDiscount[] {
    const stored = localStorage.getItem(this.DISCOUNTS_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  addDiscount(discount: Omit<CustomerDiscount, 'id'>, skipSync: boolean = false): string {
    const discounts = this.getDiscounts();
    const offlineDiscount: OfflineDiscount = {
      ...discount,
      id: this.generateId(),
      synced: false,
      last_updated: new Date().toISOString()
    };
    discounts.push(offlineDiscount);
    localStorage.setItem(this.DISCOUNTS_KEY, JSON.stringify(discounts));
    
    // Only add to sync queue if not skipping sync
    if (!skipSync) {
      this.addToSyncQueue('discount', offlineDiscount);
    }
    
    return offlineDiscount.id;
  }

  updateDiscount(id: string, updates: Partial<OfflineDiscount>): boolean {
    const discounts = this.getDiscounts();
    const index = discounts.findIndex(d => d.id === id);
    if (index === -1) return false;

    discounts[index] = { 
      ...discounts[index], 
      ...updates, 
      synced: false,
      last_updated: new Date().toISOString()
    };
    localStorage.setItem(this.DISCOUNTS_KEY, JSON.stringify(discounts));
    
    this.addToSyncQueue('discount', discounts[index]);
    return true;
  }

  getCustomerActiveDiscount(customerId: string, billMonth?: string): OfflineDiscount | null {
    // If no billMonth provided, use current month
    const targetMonth = billMonth || new Date().toISOString().substring(0, 7); // YYYY-MM format
    
    const discounts = this.getDiscounts().filter(d => 
      d.customer_id === customerId && 
      d.is_active &&
      d.discount_month === targetMonth
    );
    
    // Return the most recent active discount for the month
    return discounts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0] || null;
  }

  getCustomerDiscounts(customerId: string): OfflineDiscount[] {
    return this.getDiscounts().filter(d => d.customer_id === customerId);
  }

  // Sync Queue Management
  private addToSyncQueue(type: 'customer' | 'reading' | 'discount', data: any): void {
    const queue = this.getSyncQueue();
    queue.push({
      id: this.generateId(),
      type,
      data,
      timestamp: new Date().toISOString(),
      attempts: 0
    });
    localStorage.setItem(this.SYNC_QUEUE_KEY, JSON.stringify(queue));
  }

  getSyncQueue(): any[] {
    const stored = localStorage.getItem(this.SYNC_QUEUE_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  clearSyncQueue(): void {
    localStorage.setItem(this.SYNC_QUEUE_KEY, JSON.stringify([]));
  }

  removeSyncItem(id: string): void {
    const queue = this.getSyncQueue().filter(item => item.id !== id);
    localStorage.setItem(this.SYNC_QUEUE_KEY, JSON.stringify(queue));
  }

  // Utility methods
  private generateId(): string {
    return `offline_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  getLastSyncTime(): string | null {
    return localStorage.getItem(this.LAST_SYNC_KEY);
  }

  setLastSyncTime(timestamp: string): void {
    localStorage.setItem(this.LAST_SYNC_KEY, timestamp);
  }

  // Get storage statistics
  getStorageStats(): {
    customers: number;
    readings: number;
    discounts: number;
    pendingSync: number;
    lastSync: string | null;
  } {
    return {
      customers: this.getCustomers().length,
      readings: this.getReadings().length,
      discounts: this.getDiscounts().length,
      pendingSync: this.getSyncQueue().length,
      lastSync: this.getLastSyncTime()
    };
  }

  // Clear all offline data (for testing/reset)
  clearAllData(): void {
    localStorage.removeItem(this.CUSTOMERS_KEY);
    localStorage.removeItem(this.READINGS_KEY);
    localStorage.removeItem(this.DISCOUNTS_KEY);
    localStorage.removeItem(this.SYNC_QUEUE_KEY);
    localStorage.removeItem(this.LAST_SYNC_KEY);
  }

  // Remove readings for current month (for debugging)
  clearCurrentMonthReadings(): void {
    const readings = this.getReadings();
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    
    const filteredReadings = readings.filter(reading => {
      const readingDate = new Date(reading.date);
      return !(readingDate.getFullYear() === currentYear && readingDate.getMonth() === currentMonth);
    });
    
    localStorage.setItem(this.READINGS_KEY, JSON.stringify(filteredReadings));
    console.log(`Removed ${readings.length - filteredReadings.length} readings from current month`);
  }

  /**
   * Clear all cached data from local storage
   */
  clearAllCache(): void {
    localStorage.removeItem(this.CUSTOMERS_KEY);
    localStorage.removeItem(this.READINGS_KEY);
    localStorage.removeItem(this.DISCOUNTS_KEY);
    localStorage.removeItem(this.SYNC_QUEUE_KEY);
    localStorage.removeItem(this.LAST_SYNC_KEY);
    console.log('🗑️ All offline cache cleared');
  }

  /**
   * Clear specific data type from cache
   */
  clearCustomersCache(): void {
    localStorage.removeItem(this.CUSTOMERS_KEY);
    console.log('🗑️ Customers cache cleared');
  }

  clearReadingsCache(): void {
    localStorage.removeItem(this.READINGS_KEY);
    console.log('🗑️ Readings cache cleared');
  }

  clearDiscountsCache(): void {
    localStorage.removeItem(this.DISCOUNTS_KEY);
    console.log('🗑️ Discounts cache cleared');
  }
}

export const offlineStorage = new OfflineStorageManager();