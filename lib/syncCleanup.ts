/**
 * Sync Cleanup Utility
 * Handles cleanup of stale sync queue items and ensures proper sync state
 */

import { offlineStorage } from './offlineStorage';

export class SyncCleanup {
  /**
   * Clean up stale sync queue items
   * Removes items that are older than 24 hours and haven't been processed
   */
  static cleanupStaleItems(): void {
    try {
      const queue = offlineStorage.getSyncQueue();
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      const validItems = queue.filter(item => {
        const itemDate = new Date(item.timestamp);
        const isStale = itemDate < oneDayAgo;
        
        if (isStale) {
          console.log(`🧹 Removing stale sync item: ${item.type} from ${item.timestamp}`);
        }
        
        return !isStale;
      });
      
      if (validItems.length !== queue.length) {
        localStorage.setItem('sync_queue', JSON.stringify(validItems));
        console.log(`🧹 Cleaned up ${queue.length - validItems.length} stale sync items`);
      }
    } catch (error) {
      console.error('❌ Error cleaning up sync queue:', error);
    }
  }

  /**
   * Force clear all sync queue items
   * Use with caution - only when you're sure all items have been processed
   */
  static forceClearSyncQueue(): void {
    try {
      offlineStorage.clearSyncQueue();
      console.log('🧹 Force cleared all sync queue items');
    } catch (error) {
      console.error('❌ Error force clearing sync queue:', error);
    }
  }

  /**
   * Check if sync queue has any valid items
   */
  static hasValidSyncItems(): boolean {
    try {
      const queue = offlineStorage.getSyncQueue();
      return queue.length > 0;
    } catch (error) {
      console.error('❌ Error checking sync queue:', error);
      return false;
    }
  }
}