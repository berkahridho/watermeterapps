'use client';

import { useState, useEffect } from 'react';
import { FiWifi, FiWifiOff, FiRefreshCw, FiCheck } from 'react-icons/fi';
import { optimizedSyncManager } from '@/lib/optimizedSyncManager';

export default function OptimizedOfflineIndicator() {
  const [syncStatus, setSyncStatus] = useState({
    isOnline: navigator.onLine,
    pendingReadings: 0,
    canSync: false,
    syncInProgress: false
  });
  const [showSyncSuccess, setShowSyncSuccess] = useState(false);

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

  // Show success feedback when sync completes
  useEffect(() => {
    if (syncStatus.isOnline && !syncStatus.syncInProgress && syncStatus.pendingReadings === 0) {
      setShowSyncSuccess(true);
      const timer = setTimeout(() => setShowSyncSuccess(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [syncStatus.isOnline, syncStatus.syncInProgress, syncStatus.pendingReadings]);

  // Only show indicator when offline or syncing
  if (syncStatus.isOnline && !syncStatus.syncInProgress && syncStatus.pendingReadings === 0) {
    return null;
  }

  const getStatusColor = () => {
    if (!syncStatus.isOnline) return 'text-red-500';
    if (syncStatus.syncInProgress) return 'text-blue-500';
    return 'text-green-500';
  };

  const getStatusText = () => {
    if (!syncStatus.isOnline) return 'Offline';
    if (syncStatus.syncInProgress) return 'Syncing...';
    return '';
  };

  const getStatusIcon = () => {
    if (!syncStatus.isOnline) return FiWifiOff;
    if (syncStatus.syncInProgress) return FiRefreshCw;
    return FiCheck;
  };

  const StatusIcon = getStatusIcon();

  return (
    <div className="flex items-center space-x-2">
      {/* Status Indicator - Only show when offline or syncing */}
      {(syncStatus.syncInProgress || !syncStatus.isOnline) && (
        <div className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-opacity-10 ${
          !syncStatus.isOnline 
            ? 'bg-red-500 text-red-600 dark:text-red-400' 
            : 'bg-blue-500 text-blue-600 dark:text-blue-400'
        }`}>
          <StatusIcon 
            className={`h-4 w-4 ${syncStatus.syncInProgress ? 'animate-spin' : ''}`} 
          />
          <span className="text-xs font-medium">
            {getStatusText()}
          </span>
        </div>
      )}

      {/* Success Feedback - Brief confirmation when sync completes */}
      {showSyncSuccess && (
        <div className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-green-500 bg-opacity-10 text-green-600 dark:text-green-400 animate-fade-in">
          <FiCheck className="h-4 w-4" />
          <span className="text-xs font-medium">Synced</span>
        </div>
      )}
    </div>
  );
}