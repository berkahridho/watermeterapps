'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FiCalendar, FiSearch, FiAlertTriangle, FiUser, FiDroplet, FiBarChart2, FiDownload } from 'react-icons/fi';
import { formatDateID } from '@/utils/dateFormat';
import { supabase } from '@/lib/supabase';
import { offlineStorage } from '@/lib/offlineStorage';
import Navigation from '@/components/Navigation';
import ProtectedRoute from '@/components/ProtectedRoute';

interface MeterReading {
  id: string;
  customer_id: string;
  reading: number;
  date: string;
  created_at: string;
}

interface Customer {
  id: string;
  name: string;
  rt: string;
  phone: string;
}

interface CustomerReadingHistory {
  customer: Customer;
  readings: MeterReading[];
  monthlyData: Array<{
    month: string;
    reading: number | null;
    usage: number | null;
    date: string | null;
    anomaly: boolean;
  }>;
  totalReadings: number;
  averageUsage: number;
  lastReading: MeterReading | null;
}

// Month names in Indonesian (short form)
const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
];

export default function MeterReadingHistory() {
  const [user, setUser] = useState<any>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [readings, setReadings] = useState<MeterReading[]>([]);
  const [customerHistories, setCustomerHistories] = useState<CustomerReadingHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRT, setSelectedRT] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  // Auto-refresh data when filters change
  useEffect(() => {
    if (mounted && user) {
      fetchData();
    }
  }, [mounted, user, selectedYear]);

  // Set initial year when data is loaded
  useEffect(() => {
    if (readings.length > 0 && !selectedYear) {
      const availableYears = getAvailableYears();
      if (availableYears.length > 0) {
        setSelectedYear(availableYears[0]); // Set to most recent year with data
      }
    }
  }, [readings, selectedYear]);

  useEffect(() => {
    setMounted(true);
    
    // Check if user is logged in
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
    } else {
      setUser(JSON.parse(userData));
    }
  }, [router]);

  useEffect(() => {
    // Re-process histories when year changes without refetching data
    if (customers.length > 0 && readings.length > 0 && selectedYear) {
      processCustomerHistories(customers, readings);
    }
  }, [selectedYear, customers, readings]);

  const fetchData = async () => {
    setLoading(true);
    
    try {
      let customersData: Customer[] = [];
      let readingsData: MeterReading[] = [];
      
      // Always try to fetch from server first for fresh data
      try {
        const { data: customersResponse, error: customersError } = await supabase
          .from('customers')
          .select('*')
          .order('rt, name');
        
        if (!customersError && customersResponse) {
          customersData = customersResponse.map(c => ({
            id: c.id.toString(),
            name: c.name,
            rt: c.rt || '',
            phone: c.phone || ''
          }));
        }
      } catch (error) {
        console.error('Error fetching customers from server:', error);
      }

      try {
        const { data: readingsResponse, error: readingsError } = await supabase
          .from('meter_readings')
          .select('*')
          .order('customer_id, date');
        
        if (!readingsError && readingsResponse) {
          readingsData = readingsResponse;
        }
      } catch (error) {
        console.error('Error fetching readings from server:', error);
      }

      // Only use offline storage as fallback if server data is not available
      if (customersData.length === 0 && typeof window !== 'undefined') {
        let offlineCustomers = offlineStorage.getCustomers();
        if (offlineCustomers.length > 0) {
          customersData = offlineCustomers.map(c => ({
            id: c.id,
            name: c.name,
            rt: c.rt || '',
            phone: c.phone || ''
          }));
        }
      }
      
      // Filter customers based on user role
      if (user?.role === 'rt_pic' && user?.assigned_rt) {
        customersData = customersData.filter(customer => customer.rt === user.assigned_rt);
      }
      
      if (readingsData.length === 0 && typeof window !== 'undefined') {
        const offlineReadings = offlineStorage.getReadings();
        if (offlineReadings.length > 0) {
          readingsData = offlineReadings;
        }
      }

      console.log(`Fetched ${customersData.length} customers and ${readingsData.length} readings`);
      
      setCustomers(customersData);
      setReadings(readingsData);
      
      // Process customer histories
      if (customersData.length > 0 && readingsData.length > 0) {
        processCustomerHistories(customersData, readingsData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const processCustomerHistories = (customersData: Customer[], readingsData: MeterReading[]) => {
    const year = parseInt(selectedYear);
    const histories: CustomerReadingHistory[] = [];

    customersData.forEach(customer => {
      const customerReadings = readingsData
        .filter(reading => reading.customer_id === customer.id)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Generate monthly data for the selected year
      const monthlyData = [];
      for (let month = 1; month <= 12; month++) {
        const monthKey = `${year}-${String(month).padStart(2, '0')}`;
        
        // Find reading for this month
        const monthReading = customerReadings.find(reading => {
          const readingDate = new Date(reading.date);
          const readingMonth = `${readingDate.getFullYear()}-${String(readingDate.getMonth() + 1).padStart(2, '0')}`;
          return readingMonth === monthKey;
        });

        let usage = null;
        let anomaly = false;

        if (monthReading) {
          // Find the immediately previous reading (not just any reading before this month)
          const previousReading = customerReadings
            .filter(reading => new Date(reading.date) < new Date(monthReading.date))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]; // Get the most recent one before this month

          if (previousReading) {
            usage = monthReading.reading - previousReading.reading;
            
            // Check for anomalies (negative usage or extremely high usage)
            if (usage < 0 || usage > 100) {
              anomaly = true;
            }
          }
        }

        monthlyData.push({
          month: monthKey,
          reading: monthReading ? monthReading.reading : null,
          usage,
          date: monthReading ? monthReading.date : null,
          anomaly
        });
      }

      // Calculate statistics
      const validUsages = monthlyData.filter(m => m.usage !== null && m.usage >= 0).map(m => m.usage!);
      const averageUsage = validUsages.length > 0 ? validUsages.reduce((a, b) => a + b, 0) / validUsages.length : 0;
      const lastReading = customerReadings.length > 0 ? customerReadings[customerReadings.length - 1] : null;

      histories.push({
        customer,
        readings: customerReadings,
        monthlyData,
        totalReadings: customerReadings.length,
        averageUsage: Math.round(averageUsage * 10) / 10,
        lastReading
      });
    });

    setCustomerHistories(histories);
  };

  const getAvailableYears = () => {
    const years = new Set<string>();
    readings.forEach(reading => {
      const year = new Date(reading.date).getFullYear().toString();
      years.add(year);
    });
    
    // Add current year if no data
    if (years.size === 0) {
      years.add(new Date().getFullYear().toString());
    }
    
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  };

  const getAvailableRTs = () => {
    const rts = new Set<string>();
    customers.forEach(customer => {
      if (customer.rt) {
        rts.add(customer.rt);
      }
    });
    return Array.from(rts).sort();
  };

  const filteredHistories = customerHistories.filter(history =>
    history.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    history.customer.rt?.toLowerCase().includes(searchTerm.toLowerCase())
  ).filter(history => {
    if (selectedRT) {
      return history.customer.rt === selectedRT;
    }
    return true;
  });

  const exportToCSV = () => {
    const csvData = [];
    csvData.push([
      'Nama', 'RT', 'Telepon', 
      ...Array.from({length: 12}, (_, i) => `${MONTH_NAMES[i]} ${selectedYear} - Pembacaan`), 
      ...Array.from({length: 12}, (_, i) => `${MONTH_NAMES[i]} ${selectedYear} - Pemakaian`),
      'Total Pembacaan', 'Rata-rata Pemakaian'
    ]);
    
    filteredHistories.forEach(history => {
      const row = [
        history.customer.name,
        history.customer.rt,
        history.customer.phone,
        ...history.monthlyData.map(m => m.reading || ''),
        ...history.monthlyData.map(m => m.usage || ''),
        history.totalReadings,
        history.averageUsage
      ];
      csvData.push(row);
    });

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `riwayat-pembacaan-meter-${selectedYear}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!mounted) {
    return null;
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <Navigation user={user} currentPage="meter-history" />
        
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          {/* Header Section */}
          <div className="text-center mb-8 animate-fade-in">
            <h1 className="text-4xl font-bold text-gradient mb-3">
              Riwayat Pembacaan Meter
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Lihat riwayat pembacaan meter air per pelanggan dengan deteksi anomali otomatis
            </p>
          </div>

          {/* Filters */}
          <div className="card mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiSearch className="text-gray-400 dark:text-gray-500" />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Cari pelanggan..."
                  className="input-field pl-10"
                />
              </div>
              
              <div className="relative">
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="input-field"
                >
                  {!selectedYear && <option value="">Pilih Tahun...</option>}
                  {getAvailableYears().map(year => (
                    <option key={year} value={year}>
                      Tahun {year}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="relative">
                <select
                  value={selectedRT}
                  onChange={(e) => setSelectedRT(e.target.value)}
                  className="input-field"
                >
                  <option value="">Semua RT</option>
                  {getAvailableRTs().map(rt => (
                    <option key={rt} value={rt}>
                      {rt}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <div className="stat-card bg-gradient-to-br from-blue-500 to-blue-600">
                <FiUser className="stat-icon" />
                <div>
                  <p className="stat-label">Pelanggan</p>
                  <p className="stat-value">{filteredHistories.length}</p>
                </div>
              </div>
              
              <div className="stat-card bg-gradient-to-br from-green-500 to-green-600">
                <FiBarChart2 className="stat-icon" />
                <div>
                  <p className="stat-label">Pembacaan</p>
                  <p className="stat-value">
                    {filteredHistories.reduce((sum, h) => sum + h.totalReadings, 0)}
                  </p>
                </div>
              </div>
              
              <div className="stat-card bg-gradient-to-br from-yellow-500 to-orange-500">
                <FiAlertTriangle className="stat-icon" />
                <div>
                  <p className="stat-label">Anomali</p>
                  <p className="stat-value">
                    {filteredHistories.reduce((sum, h) => sum + h.monthlyData.filter(m => m.anomaly).length, 0)}
                  </p>
                </div>
              </div>
              
              <div className="stat-card bg-gradient-to-br from-purple-500 to-pink-500">
                <FiDroplet className="stat-icon" />
                <div>
                  <p className="stat-label">Rata-rata</p>
                  <p className="stat-value">
                    {filteredHistories.length > 0 
                      ? Math.round((filteredHistories.reduce((sum, h) => sum + h.averageUsage, 0) / filteredHistories.length) * 10) / 10
                      : 0} m³
                  </p>
                </div>
              </div>
            </div>

            {/* Export Button */}
            <div className="flex justify-end">
              <button 
                onClick={exportToCSV}
                disabled={filteredHistories.length === 0}
                className="btn-primary"
              >
                <FiDownload className="w-4 h-4 mr-2" />
                Export CSV
              </button>
            </div>
          </div>

          {/* History Table */}
          {loading ? (
            <div className="card text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400 font-medium">Memuat riwayat pembacaan...</p>
            </div>
          ) : !selectedYear ? (
            <div className="card text-center py-12">
              <FiCalendar className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Pilih Tahun</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Pilih tahun untuk melihat riwayat pembacaan meter.
              </p>
            </div>
          ) : (
            <div className="card overflow-hidden table-rounded">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 table-compact">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="sticky left-0 bg-gray-50 dark:bg-gray-700 px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-r border-gray-200 dark:border-gray-600 z-10 customer-cell">
                        Pelanggan
                      </th>
                      <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider rt-cell">
                        RT
                      </th>
                      {Array.from({length: 12}, (_, i) => (
                        <th key={i} className="px-2 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-l border-gray-200 dark:border-gray-600 month-cell">
                          {MONTH_NAMES[i]}
                        </th>
                      ))}
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-l-2 border-gray-300 dark:border-gray-600 min-w-[70px]">
                        Total
                      </th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[80px]">
                        Rata-rata
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredHistories.map((history) => (
                      <tr key={history.customer.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150">
                        <td className="sticky left-0 bg-white dark:bg-gray-800 px-3 py-2 border-r border-gray-200 dark:border-gray-600 z-10 customer-cell">
                          <div>
                            <div className="text-xs font-medium text-gray-900 dark:text-white truncate">
                              {history.customer.name}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {history.customer.phone}
                            </div>
                          </div>
                        </td>
                        <td className="px-2 py-2 text-center rt-cell">
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                            {history.customer.rt}
                          </span>
                        </td>
                        {history.monthlyData.map((monthData, index) => (
                          <td key={index} className="px-1.5 py-2 text-center text-xs border-l border-gray-200 dark:border-gray-600 month-cell">
                            {monthData.reading !== null ? (
                              <div className={`${monthData.anomaly ? 'bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-md p-1' : ''}`}>
                                <div className="font-medium text-gray-900 dark:text-white text-xs">
                                  {monthData.reading}
                                </div>
                                {monthData.usage !== null && (
                                  <div className={`text-xs ${monthData.anomaly ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
                                    {monthData.usage > 0 ? `+${monthData.usage}` : monthData.usage}
                                  </div>
                                )}
                                {monthData.anomaly && (
                                  <FiAlertTriangle className="h-2.5 w-2.5 text-red-500 mx-auto mt-0.5" />
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400 dark:text-gray-600 text-xs">-</span>
                            )}
                          </td>
                        ))}
                        <td className="px-3 py-2 text-center text-xs font-medium text-gray-900 dark:text-white border-l-2 border-gray-300 dark:border-gray-600">
                          {history.totalReadings}
                        </td>
                        <td className="px-3 py-2 text-center text-xs font-medium text-gray-900 dark:text-white">
                          {history.averageUsage} m³
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {filteredHistories.length === 0 && (
                <div className="text-center py-12">
                  <FiBarChart2 className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Tidak ada data</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Tidak ada riwayat pembacaan meter untuk filter yang dipilih.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}