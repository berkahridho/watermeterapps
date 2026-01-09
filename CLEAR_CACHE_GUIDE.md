# How to Clear Local Storage Cache

## Problem
The app is showing old data even after the database has been cleared because it's using cached data from local storage.

## Solutions

### Method 1: Use the Clear Cache Button (Recommended)
1. Go to the Reports page
2. Look for the red "Clear Cache" button in the filter section
3. Click "Clear Cache"
4. Confirm when prompted
5. The page will automatically refresh with fresh data from the database

### Method 2: Use Force Refresh Button
1. Go to the Reports page
2. Click the blue "Force Refresh" button
3. This bypasses the cache and fetches fresh data directly from the server

### Method 3: Browser Console (For Developers)
1. Open your browser's Developer Tools (F12)
2. Go to the Console tab
3. Type one of these commands:

#### Clear all cache:
```javascript
clearWaterMeterCache()
```

#### Check what's in cache:
```javascript
showCacheInfo()
```

#### Manual localStorage clearing:
```javascript
// Clear all water meter related data
localStorage.removeItem('offline_customers');
localStorage.removeItem('offline_readings');
localStorage.removeItem('offline_discounts');
localStorage.removeItem('sync_queue');
localStorage.removeItem('last_sync');
console.log('Cache cleared manually');
```

### Method 4: Browser Settings
1. Open your browser settings
2. Go to Privacy/Storage settings
3. Clear browsing data for the site
4. Or use Ctrl+Shift+Delete and clear cached data

## What Gets Cleared

When you clear the cache, the following data is removed from local storage:
- **offline_customers**: Cached customer data
- **offline_readings**: Cached meter readings
- **offline_discounts**: Cached discount information
- **sync_queue**: Pending synchronization items
- **last_sync**: Last synchronization timestamp

## After Clearing Cache

1. The app will fetch fresh data directly from the Supabase database
2. If the database is empty, you'll see empty tables (no fake data)
3. Any new data added to the database will appear immediately
4. The cache will rebuild as you use the app

## Automatic Cache Management

The app now includes improved cache management:
- **Server-first approach**: Always tries to get fresh data from the database first
- **Smart fallback**: Only uses cached data when the server is unavailable
- **Force refresh option**: Bypasses cache completely when needed
- **No fake data**: Removed hardcoded demo data that was causing confusion

## Troubleshooting

If you're still seeing old data after clearing cache:

1. **Hard refresh the browser**: Ctrl+F5 (Windows) or Cmd+Shift+R (Mac)
2. **Check network tab**: Make sure API calls are being made to Supabase
3. **Verify database**: Check your Supabase dashboard to confirm data is actually cleared
4. **Try incognito mode**: Open the app in a private/incognito window
5. **Clear all browser data**: Use browser settings to clear all data for the site

## Prevention

To avoid cache issues in the future:
- Use the "Force Refresh" button when you want to ensure fresh data
- The app will automatically prioritize server data over cached data
- Cache is now only used as a fallback for offline scenarios

## Developer Notes

The cache clearing functionality is implemented in:
- `lib/offlineStorage.ts`: Contains the `clearAllCache()` method
- `app/reports/page.tsx`: UI buttons and global console functions
- Global functions available in browser console: `clearWaterMeterCache()` and `showCacheInfo()`