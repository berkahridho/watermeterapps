/**
 * Offline Indicator Component
 * Shows network status and sync information
 */

'use client';

import { useState, useEffect } from 'react';
import { FiWifi, FiWifiOff, FiRefreshCw, FiCheck, FiAlertCircle, FiDatabase } from 'react-icons/fi';
import { syncManager, SyncResult } from '@/lib/syncManager';
import { offlineStorage } from '@/lib/offlineStorage';
import { formatDateID } from '@/utils/dateFormat';

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(false);
  const [syncStatus, setSyncStatus] = useState({
    isOnline: false,
    syncInProgress: false,
    pendingItems: 0,
    lastSync: null as string | null,
  });
  const [showDetails, setShowDetails] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);
  const [mounted, setMounted] = useState(false);
  const [supabaseStatus, setSupabaseStatus] = useState<{ connected: boolean; error?: string } | null>(null);

  useEffect(() => {
    setMounted(true);
    setIsOnline(navigator.onLine);
    setSyncStatus(syncManager.getSyncStatus());
    
    // Check Supabase connection status
    if (navigator.onLine) {
      syncManager.checkSupabaseConnection().then(setSupabaseStatus);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const handleOnline = () => {
      setIsOnline(true);
      // Check Supabase connection when coming online
      syncManager.checkSupabaseConnection().then(setSupabaseStatus);
    };
    const handleOffline = () => {
      setIsOnline(false);
      setSupabaseStatus(null);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Update sync status periodically
    const interval = setInterval(() => {
      setSyncStatus(syncManager.getSyncStatus());
    }, 1000);

    // Listen for sync completion
    const handleSyncComplete = (result: SyncResult) => {
      setLastSyncResult(result);
      setSyncStatus(syncManager.getSyncStatus());
    };

    syncManager.onSyncComplete(handleSyncComplete);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
      syncManager.removeSyncCallback(handleSyncComplete);
    };
  }, [mounted]);

  const handleManualSync = async () => {
    if (syncStatus.syncInProgress) return;
    
    try {
      const result = await syncManager.sync();
      
      if (result.errors.length > 0) {
        console.error('Sync errors:', result.errors);
      }
    } catch (error) {
      console.error('Manual sync failed:', error);
    }
  };

  const getStatusColor = () => {
    if (!isOnline) return 'bg-red-500';
    if (syncStatus.pendingItems > 0) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStatusText = () => {
    if (!isOnline) return 'Offline';
    if (syncStatus.syncInProgress) return 'Syncing...';
    if (syncStatus.pendingItems > 0) return `${syncStatus.pendingItems} pending`;
    return 'Online';
  };

  const storageStats = mounted ? offlineStorage.getStorageStats() : {
    customers: 0,
    readings: 0,
    discounts: 0,
    pendingSync: 0,
    lastSync: null
  };

  // Don't render until mounted to avoid hydration mismatch
  if (!mounted) {
    return (
      <div className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-gray-500 text-white text-sm font-medium">
        <FiWifiOff className="h-4 w-4" />
        <span>Loading...</span>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Main Status Indicator */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-white text-sm font-medium transition-all ${getStatusColor()} hover:opacity-90`}
      >
        {isOnline ? (
          syncStatus.syncInProgress ? (
            <FiRefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <FiWifi className="h-4 w-4" />
          )
        ) : (
          <FiWifiOff className="h-4 w-4" />
        )}
        <span>{getStatusText()}</span>
      </button>

      {/* Details Dropdown */}
      {showDetails && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 z-50">
          <div className="space-y-4">
            {/* Network Status */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Network Status</span>
              <div className="flex items-center space-x-2">
                {isOnline ? (
                  <>
                    <FiWifi className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-green-600 dark:text-green-400">Online</span>
                  </>
                ) : (
                  <>
                    <FiWifiOff className="h-4 w-4 text-red-500" />
                    <span className="text-sm text-red-600 dark:text-red-400">Offline</span>
                  </>
                )}
              </div>
            </div>

            {/* Supabase Connection Status */}
            {isOnline && supabaseStatus && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Database Status</span>
                  <div className="flex items-center space-x-2">
                    {supabaseStatus.connected ? (
                      <>
                        <FiCheck className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-green-600 dark:text-green-400">Connected</span>
                      </>
                    ) : (
                      <>
                        <FiAlertCircle className="h-4 w-4 text-yellow-500" />
                        <span className="text-sm text-yellow-600 dark:text-yellow-400">Offline Mode</span>
                      </>
                    )}
                  </div>
                </div>
                {supabaseStatus.error && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {supabaseStatus.error}
                  </p>
                )}
              </div>
            )}

            {/* Storage Stats */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
              <div className="flex items-center space-x-2 mb-2">
                <FiDatabase className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Local Storage</span>
              </div>
              <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                <div className="flex justify-between">
                  <span>Customers:</span>
                  <span>{storageStats.customers}</span>
                </div>
                <div className="flex justify-between">
                  <span>Readings:</span>
                  <span>{storageStats.readings}</span>
                </div>
                <div className="flex justify-between">
                  <span>Discounts:</span>
                  <span>{storageStats.discounts}</span>
                </div>
                <div className="flex justify-between">
                  <span>Pending Sync:</span>
                  <span className={syncStatus.pendingItems > 0 ? 'text-yellow-600 dark:text-yellow-400 font-medium' : ''}>
                    {syncStatus.pendingItems}
                  </span>
                </div>
              </div>
            </div>

            {/* Last Sync */}
            {syncStatus.lastSync && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Last Sync</span>
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {formatDateID(syncStatus.lastSync)}
                  </span>
                </div>
              </div>
            )}

            {/* Last Sync Result */}
            {lastSyncResult && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                <div className="flex items-center space-x-2 mb-2">
                  {lastSyncResult.success ? (
                    <FiCheck className="h-4 w-4 text-green-500" />
                  ) : (
                    <FiAlertCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {lastSyncResult.success ? 'Sync Successful' : 'Sync Issues'}
                  </span>
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  <div>Synced: {lastSyncResult.synced}</div>
                  {lastSyncResult.failed > 0 && <div>Failed: {lastSyncResult.failed}</div>}
                </div>
              </div>
            )}

            {/* Manual Sync Button */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
              <div className="space-y-2">
                <button
                  onClick={handleManualSync}
                  disabled={!isOnline || syncStatus.syncInProgress}
                  className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <FiRefreshCw className={`h-4 w-4 ${syncStatus.syncInProgress ? 'animate-spin' : ''}`} />
                  <span>
                    {syncStatus.syncInProgress ? 'Syncing...' : 'Sync Now'}
                  </span>
                </button>
                
                {/* Debug: Clear sync queue button */}
                {syncStatus.pendingItems > 0 && (
                  <button
                    onClick={() => {
                      if (window.confirm('Clear all pending sync items? This will remove unsaved changes.')) {
                        offlineStorage.clearSyncQueue();
                        setSyncStatus(syncManager.getSyncStatus());
                      }
                    }}
                    className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
                  >
                    <FiAlertCircle className="h-4 w-4" />
                    <span>Clear Sync Queue</span>
                  </button>
                )}
                
                {/* Debug: Test Supabase connection */}
                {isOnline && (
                  <button
                    onClick={async () => {
                      const status = await syncManager.checkSupabaseConnection();
                      setSupabaseStatus(status);
                    }}
                    className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-gray-500 text-white rounded-lg text-sm font-medium hover:bg-gray-600 transition-colors"
                  >
                    <FiDatabase className="h-4 w-4" />
                    <span>Test Database</span>
                  </button>
                )}
              </div>
            </div>

            {/* Offline Mode Notice */}
            {!isOnline && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <FiAlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-yellow-700 dark:text-yellow-300">
                    <div className="font-medium mb-1">Mode Offline Aktif</div>
                    <div>Data disimpan secara lokal dan akan disinkronkan saat koneksi tersedia.</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}