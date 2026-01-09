'use client';

import { useState, useEffect } from 'react';
import { FiWifi, FiWifiOff, FiRefreshCw, FiCheck, FiClock } from 'react-icons/fi';
import { optimizedSyncManager } from '@/lib/optimizedSyncManager';

export default function OptimizedOfflineIndicator() {
  const [syncStatus, setSyncStatus] = useState({
    isOnline: navigator.onLine,
    pendingReadings: 0,
    canSync: false,
    syncInProgress: false
  });
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  useEffect(() => {
    // Update status every second
    const interval = setInterval(() => {
      const status = optimizedSyncManager.getSyncStatus();
      setSyncStatus(status);
    }, 1000);

    // Start auto-sync
    optimizedSyncManager.startAutoSync();

    return () => clearInterval(interval);
  }, []);

  const handleManualSync = async () => {
    try {
      const result = await optimizedSyncManager.manualSync();
      if (result.success) {
        setLastSyncTime(new Date());
      }
    } catch (error) {
      console.error('Manual sync failed:', error);
    }
  };

  const getStatusColor = () => {
    if (!syncStatus.isOnline) return 'text-red-500';
    if (syncStatus.pendingReadings > 0) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getStatusText = () => {
    if (!syncStatus.isOnline) return 'Offline';
    if (syncStatus.syncInProgress) return 'Syncing...';
    if (syncStatus.pendingReadings > 0) return `${syncStatus.pendingReadings} pending`;
    return 'Online';
  };

  const getStatusIcon = () => {
    if (!syncStatus.isOnline) return FiWifiOff;
    if (syncStatus.syncInProgress) return FiRefreshCw;
    if (syncStatus.pendingReadings > 0) return FiClock;
    return FiWifi;
  };

  const StatusIcon = getStatusIcon();

  return (
    <div className="flex items-center space-x-2">
      {/* Status Indicator */}
      <div className={`flex items-center space-x-1 ${getStatusColor()}`}>
        <StatusIcon 
          className={`h-4 w-4 ${syncStatus.syncInProgress ? 'animate-spin' : ''}`} 
        />
        <span className="text-xs font-medium hidden sm:inline">
          {getStatusText()}
        </span>
      </div>

      {/* Manual Sync Button */}
      {syncStatus.isOnline && syncStatus.pendingReadings > 0 && !syncStatus.syncInProgress && (
        <button
          onClick={handleManualSync}
          className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title="Sync pending readings"
        >
          <FiRefreshCw className="h-3 w-3 text-blue-500" />
        </button>
      )}

      {/* Last Sync Time */}
      {lastSyncTime && (
        <span className="text-xs text-gray-500 dark:text-gray-400 hidden md:inline">
          Last sync: {lastSyncTime.toLocaleTimeString('id-ID', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </span>
      )}
    </div>
  );
}