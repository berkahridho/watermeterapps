'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FiRefreshCw, FiCheckCircle, FiAlertCircle, FiWifi, FiWifiOff, FiClock, FiTrash2 } from 'react-icons/fi';
import { Customer, User } from '@/types/types';
import { supabase } from '@/lib/supabase';
import { offlineStorage } from '@/lib/offlineStorage';
import Navigation from '@/components/Navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import MeterReadingForm from '@/components/MeterReadingForm';

export default function MeterReadingPage() {
  const [user, setUser] = useState<User | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [availableCustomers, setAvailableCustomers] = useState<Customer[]>([]);
  const [submittedCustomerIds, setSubmittedCustomerIds] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<{type: string, text: string} | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string>('');
  const [lastSync, setLastSync] = useState<string>('');
  const router = useRouter();
  
  useEffect(() => {
    // Check if user is logged in
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }
    
    const user = JSON.parse(userData);
    
    // Block viewer access to meter reading
    if (user.role === 'viewer') {
      router.push('/dashboard');
      return;
    }
    
    setUser(user);
    setMounted(true);
    setIsOnline(navigator.onLine);

    // Listen for online/offline events
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [router]);

  // Load data when mounted and user is available
  useEffect(() => {
    if (mounted && user) {
      loadData();
    }
  }, [mounted, user]);

  const handleClearCache = () => {
    if (confirm('Hapus semua data cache? Data akan dimuat ulang dari server.')) {
      offlineStorage.clearAllCache();
      loadData(true); // Bypass cache
    }
  };

  const handleForceRefresh = () => {
    loadData(true); // Bypass cache
  };

  const loadData = async (bypassCache: boolean = false) => {
    try {
      let customers: Customer[] = [];
      
      // Always try to fetch fresh data from server first
      try {
        const { data: customersData, error: customersError } = await supabase
          .from('customers')
          .select('*')
          .order('rt, name');
        
        if (!customersError && customersData) {
          let filteredCustomersData = customersData;
          
          // Filter customers based on user role
          if (user?.role === 'rt_pic' && user?.assigned_rt) {
            filteredCustomersData = customersData.filter(customer => customer.rt === user.assigned_rt);
          }
          
          customers = filteredCustomersData.map(c => ({
            id: c.id.toString(),
            name: c.name,
            rt: c.rt || '',
            phone: c.phone || ''
          }));
          
          setCustomers(customers);
          
          // Load submitted readings for this month and filter available customers
          await loadSubmittedReadings(customers);
        }
      } catch (error) {
        console.error('Error fetching customers from server:', error);
      }

      // Only use offline storage as fallback if server is completely unavailable AND not bypassing cache
      if (customers.length === 0 && !bypassCache && typeof window !== 'undefined') {
        let offlineCustomers = offlineStorage.getCustomers();
        
        if (offlineCustomers.length > 0) {
          // Filter customers based on user role
          if (user?.role === 'rt_pic' && user?.assigned_rt) {
            offlineCustomers = offlineCustomers.filter(customer => customer.rt === user.assigned_rt);
          }
          
          customers = offlineCustomers.map(c => ({
            id: c.id,
            name: c.name,
            rt: c.rt || '',
            phone: c.phone || ''
          }));
          setCustomers(customers);
          
          // Load submitted readings for this month and filter available customers
          await loadSubmittedReadings(customers);
        }
      }

      // Data loaded successfully - no automatic sync to prevent loops
    } catch (error) {
      console.error('Error loading data:', error);
      showMessage('error', 'Gagal memuat data pelanggan');
    }
  };

  const loadSubmittedReadings = async (customersList: Customer[]) => {
    try {
      // Get current month
      const now = new Date();
      
      // Get customer IDs for this RT
      const customerIds = customersList.map(c => c.id);
      
      if (customerIds.length === 0) {
        setSubmittedCustomerIds(new Set());
        setAvailableCustomers(customersList);
        return;
      }
      
      // Get ALL meter readings for these customers and filter in JavaScript
      // This avoids any date format issues with the database query
      const { data: readings, error } = await supabase
        .from('meter_readings')
        .select('customer_id, date')
        .in('customer_id', customerIds);
      
      if (!error && readings) {
        // Filter readings to current month in JavaScript
        const currentMonthReadings = readings.filter(reading => {
          try {
            // Handle different date formats
            const readingDate = new Date(reading.date);
            const readingYear = readingDate.getFullYear();
            const readingMonth = readingDate.getMonth() + 1; // getMonth() returns 0-11
            const currentYear = now.getFullYear();
            const currentMonthNum = now.getMonth() + 1;
            
            return readingYear === currentYear && readingMonth === currentMonthNum;
          } catch (e) {
            console.error('Error parsing date:', reading.date, e);
            return false;
          }
        });
        
        // Get unique customer IDs who have submitted readings
        const submittedIds = new Set(currentMonthReadings.map(r => r.customer_id.toString()));
        setSubmittedCustomerIds(submittedIds);
        
        // Filter out customers who have already submitted readings
        const availableCustomers = customersList.filter(c => !submittedIds.has(c.id));
        setAvailableCustomers(availableCustomers);
      } else {
        console.error('Error loading readings:', error);
        // If error, show all customers
        setSubmittedCustomerIds(new Set());
        setAvailableCustomers(customersList);
      }
    } catch (error) {
      console.error('Error loading submitted readings:', error);
      // If error, show all customers
      setSubmittedCustomerIds(new Set());
      setAvailableCustomers(customersList);
    }
  };

  const syncData = async () => {
    try {
      setSyncStatus('Sinkronisasi data...');
      
      // Just reload customers from server without triggering another sync
      try {
        const { data: customersData, error: customersError } = await supabase
          .from('customers')
          .select('*')
          .order('rt, name');
        
        if (!customersError && customersData) {
          let filteredCustomersData = customersData;
          
          // Filter customers based on user role
          if (user?.role === 'rt_pic' && user?.assigned_rt) {
            filteredCustomersData = customersData.filter(customer => customer.rt === user.assigned_rt);
          }
          
          const customers = filteredCustomersData.map(c => ({
            id: c.id.toString(),
            name: c.name,
            rt: c.rt || '',
            phone: c.phone || ''
          }));
          
          setCustomers(customers);
        }
      } catch (error) {
        console.error('Error syncing customers:', error);
      }
      
      const now = new Date().toLocaleString('id-ID');
      setLastSync(now);
      setSyncStatus('Data berhasil disinkronkan');
      setTimeout(() => setSyncStatus(''), 3000);
    } catch (error) {
      console.error('Sync error:', error);
      setSyncStatus('Gagal sinkronisasi data');
      setTimeout(() => setSyncStatus(''), 3000);
    }
  };

  const handleReadingSubmitted = () => {
    showMessage('success', 'Pembacaan meter berhasil disimpan!');
    
    // Reload submitted readings to update the available customers list
    if (user?.role === 'rt_pic') {
      loadSubmittedReadings(customers);
    }
  };

  const handleError = (error: string) => {
    showMessage('error', error);
  };

  const showMessage = (type: string, text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
          <p className="text-gray-600 dark:text-gray-400 font-medium">Memuat aplikasi...</p>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        {user && <Navigation user={user} currentPage="meter" />}
        
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          {/* Header Section */}
          <div className="text-center mb-8 animate-fade-in">
            <h1 className="text-4xl font-bold text-gradient mb-3">
              Input Pembacaan Meter
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Masukkan pembacaan meter air untuk pelanggan dengan validasi otomatis dan pratinjau tagihan
            </p>
          </div>

          {/* RT PIC Quick Info */}
          {user?.role === 'rt_pic' && (
            <div className="mb-8 card bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-blue-200 dark:border-blue-800 animate-slide-up">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-blue-900 dark:text-blue-100 mb-1">
                    👋 Selamat datang, {user?.full_name || user?.email}
                  </h2>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Anda ditugaskan untuk RT: <span className="font-bold">{user?.assigned_rt || 'N/A'}</span>
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    Total pelanggan: <span className="font-bold">{customers.length}</span>
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    Pembacaan selesai bulan ini: <span className="font-bold text-green-600 dark:text-green-400">{submittedCustomerIds.size} / {customers.length}</span>
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    Sisa yang belum: <span className="font-bold text-orange-600 dark:text-orange-400">{availableCustomers.length}</span>
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {submittedCustomerIds.size}/{customers.length}
                  </div>
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Selesai</p>
                  {availableCustomers.length === 0 && customers.length > 0 && (
                    <div className="mt-2 px-2 py-1 bg-green-100 dark:bg-green-900/20 rounded-full">
                      <p className="text-xs text-green-600 dark:text-green-400 font-bold">✅ Semua Selesai!</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Status Bar */}
          <div className="mb-8">
            <div className="card-compact flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              {/* Connection Status */}
              <div className="flex items-center gap-3">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                  isOnline 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300' 
                    : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                }`}>
                  {isOnline ? <FiWifi className="w-4 h-4" /> : <FiWifiOff className="w-4 h-4" />}
                  <span>{isOnline ? 'Online' : 'Offline'}</span>
                </div>
                
                {lastSync && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <FiClock className="w-4 h-4" />
                    <span>Sinkronisasi terakhir: {lastSync}</span>
                  </div>
                )}
              </div>
              
              {/* Sync Status and Button */}
              <div className="flex items-center gap-3 h-10">
                {syncStatus && (
                  <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                    {syncStatus}
                  </div>
                )}
                
                {isOnline && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={syncData}
                      className="btn-secondary text-sm"
                    >
                      <FiRefreshCw className="w-4 h-4 mr-2" />
                      Sinkronkan
                    </button>
                    
                    <button
                      onClick={handleForceRefresh}
                      className="btn-secondary text-sm"
                      title="Muat ulang data dari server"
                    >
                      <FiRefreshCw className="w-4 h-4 mr-2" />
                      Refresh
                    </button>
                    
                    <button
                      onClick={handleClearCache}
                      className="btn-secondary text-sm text-red-600 hover:text-red-700"
                      title="Hapus cache dan muat ulang"
                    >
                      <FiTrash2 className="w-4 h-4 mr-2" />
                      Clear Cache
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Success/Error Messages */}
          {message && (
            <div className="mb-8 animate-scale-in">
              <div className={`${
                message.type === 'success' ? 'alert-success' : 'alert-danger'
              }`}>
                <div className="flex items-center gap-3">
                  {message.type === 'success' ? (
                    <FiCheckCircle className="w-5 h-5 flex-shrink-0" />
                  ) : (
                    <FiAlertCircle className="w-5 h-5 flex-shrink-0" />
                  )}
                  <span className="font-medium">{message.text}</span>
                </div>
              </div>
            </div>
          )}

          {/* Main Form */}
          <div className="mb-8">
            <MeterReadingForm
              customers={availableCustomers}
              onReadingSubmitted={handleReadingSubmitted}
              onError={handleError}
              isOnline={isOnline}
            />
          </div>

          {/* Instructions Card */}
          <div className="card animate-slide-up">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-modern">
                <FiCheckCircle className="text-white text-xl" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  Petunjuk Penggunaan
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-blue-600 dark:text-blue-400">1</span>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        Pilih pelanggan dari daftar dropdown
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-blue-600 dark:text-blue-400">2</span>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        Masukkan pembacaan meter saat ini dalam satuan m³
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-blue-600 dark:text-blue-400">3</span>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        Pastikan pembacaan tidak lebih kecil dari pembacaan sebelumnya
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-green-600 dark:text-green-400">4</span>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        Sistem akan memberikan peringatan jika pemakaian tidak wajar
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-green-600 dark:text-green-400">5</span>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        Data akan disimpan secara offline dan disinkronkan saat online
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-green-600 dark:text-green-400">6</span>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        Lihat pratinjau tagihan sebelum menyimpan data
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}