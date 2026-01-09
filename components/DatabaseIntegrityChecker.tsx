'use client';

import { useState, useEffect } from 'react';
import { FiAlertTriangle, FiCheckCircle, FiRefreshCw, FiDatabase, FiUsers, FiDroplet, FiCalendar } from 'react-icons/fi';
import { supabase } from '@/lib/supabase';
import { offlineStorage } from '@/lib/offlineStorage';

interface IntegrityIssue {
  type: 'error' | 'warning' | 'info';
  category: string;
  message: string;
  count?: number;
  details?: string[];
}

interface DatabaseStats {
  totalCustomers: number;
  totalReadings: number;
  customersWithReadings: number;
  customersWithoutReadings: number;
  duplicateReadings: number;
  negativeUsage: number;
  extremeUsage: number;
  missingMonthlyReadings: number;
  rtDistribution: Record<string, number>;
  monthlyReadingDistribution: Record<string, number>;
}

export default function DatabaseIntegrityChecker() {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [issues, setIssues] = useState<IntegrityIssue[]>([]);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const runIntegrityCheck = async () => {
    setLoading(true);
    setIssues([]);
    
    try {
      // Get data from offline storage or server
      let customers: any[] = [];
      let readings: any[] = [];
      
      if (typeof window !== 'undefined') {
        const offlineCustomers = offlineStorage.getCustomers();
        const offlineReadings = offlineStorage.getReadings();
        
        if (offlineCustomers.length > 0) {
          customers = offlineCustomers;
        }
        
        if (offlineReadings.length > 0) {
          readings = offlineReadings;
        }
      }

      // If no offline data, fetch from server
      if (customers.length === 0) {
        try {
          const { data: customersData, error: customersError } = await supabase
            .from('customers')
            .select('*');
          
          if (!customersError && customersData) {
            customers = customersData;
          }
        } catch (error) {
          console.error('Error fetching customers:', error);
        }
      }

      if (readings.length === 0) {
        try {
          const { data: readingsData, error: readingsError } = await supabase
            .from('meter_readings')
            .select('*')
            .order('customer_id, date');
          
          if (!readingsError && readingsData) {
            readings = readingsData;
          }
        } catch (error) {
          console.error('Error fetching readings:', error);
        }
      }

      // Calculate statistics
      const customerIds = new Set(customers.map(c => c.id));
      const customersWithReadings = new Set(readings.map(r => r.customer_id));
      const customersWithoutReadings = Array.from(customerIds).filter(id => !customersWithReadings.has(id));
      
      // RT distribution
      const rtDistribution: Record<string, number> = {};
      customers.forEach(customer => {
        const rt = customer.rt || 'Unknown';
        rtDistribution[rt] = (rtDistribution[rt] || 0) + 1;
      });

      // Monthly reading distribution
      const monthlyReadingDistribution: Record<string, number> = {};
      readings.forEach(reading => {
        const date = new Date(reading.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthlyReadingDistribution[monthKey] = (monthlyReadingDistribution[monthKey] || 0) + 1;
      });

      // Check for duplicate readings (same customer, same month)
      const readingKeys = new Set();
      const duplicates: string[] = [];
      readings.forEach(reading => {
        const date = new Date(reading.date);
        const monthKey = `${reading.customer_id}-${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (readingKeys.has(monthKey)) {
          const customer = customers.find(c => c.id === reading.customer_id);
          duplicates.push(`${customer?.name || 'Unknown'} - ${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
        }
        readingKeys.add(monthKey);
      });

      // Check for negative usage and extreme usage
      const negativeUsageCustomers: string[] = [];
      const extremeUsageCustomers: string[] = [];
      
      customers.forEach(customer => {
        const customerReadings = readings
          .filter(r => r.customer_id === customer.id)
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        for (let i = 1; i < customerReadings.length; i++) {
          const current = customerReadings[i];
          const previous = customerReadings[i - 1];
          const usage = current.reading - previous.reading;
          
          if (usage < 0) {
            negativeUsageCustomers.push(`${customer.name} (${new Date(current.date).toLocaleDateString('id-ID')}): ${usage} m³`);
          } else if (usage > 100) {
            extremeUsageCustomers.push(`${customer.name} (${new Date(current.date).toLocaleDateString('id-ID')}): ${usage} m³`);
          }
        }
      });

      const calculatedStats: DatabaseStats = {
        totalCustomers: customers.length,
        totalReadings: readings.length,
        customersWithReadings: customersWithReadings.size,
        customersWithoutReadings: customersWithoutReadings.length,
        duplicateReadings: duplicates.length,
        negativeUsage: negativeUsageCustomers.length,
        extremeUsage: extremeUsageCustomers.length,
        missingMonthlyReadings: 0, // Will calculate based on expected vs actual
        rtDistribution,
        monthlyReadingDistribution
      };

      setStats(calculatedStats);

      // Generate issues
      const foundIssues: IntegrityIssue[] = [];

      if (customersWithoutReadings.length > 0) {
        foundIssues.push({
          type: 'warning',
          category: 'Data Completeness',
          message: `${customersWithoutReadings.length} pelanggan belum memiliki pembacaan meter`,
          count: customersWithoutReadings.length,
          details: customersWithoutReadings.map(id => {
            const customer = customers.find(c => c.id === id);
            return `${customer?.name || 'Unknown'} (${customer?.rt || 'Unknown RT'})`;
          }).slice(0, 10)
        });
      }

      if (duplicates.length > 0) {
        foundIssues.push({
          type: 'error',
          category: 'Data Integrity',
          message: `${duplicates.length} pembacaan duplikat ditemukan`,
          count: duplicates.length,
          details: duplicates.slice(0, 10)
        });
      }

      if (negativeUsageCustomers.length > 0) {
        foundIssues.push({
          type: 'error',
          category: 'Data Quality',
          message: `${negativeUsageCustomers.length} pembacaan dengan pemakaian negatif`,
          count: negativeUsageCustomers.length,
          details: negativeUsageCustomers.slice(0, 10)
        });
      }

      if (extremeUsageCustomers.length > 0) {
        foundIssues.push({
          type: 'warning',
          category: 'Data Quality',
          message: `${extremeUsageCustomers.length} pembacaan dengan pemakaian ekstrem (>100 m³)`,
          count: extremeUsageCustomers.length,
          details: extremeUsageCustomers.slice(0, 10)
        });
      }

      // Check RT balance
      const rtCounts = Object.values(rtDistribution);
      const avgCustomersPerRT = rtCounts.reduce((a, b) => a + b, 0) / rtCounts.length;
      const imbalancedRTs = Object.entries(rtDistribution).filter(([rt, count]) => 
        Math.abs(count - avgCustomersPerRT) > avgCustomersPerRT * 0.5
      );

      if (imbalancedRTs.length > 0) {
        foundIssues.push({
          type: 'info',
          category: 'Data Distribution',
          message: `${imbalancedRTs.length} RT memiliki distribusi pelanggan tidak seimbang`,
          details: imbalancedRTs.map(([rt, count]) => `${rt}: ${count} pelanggan`)
        });
      }

      if (foundIssues.length === 0) {
        foundIssues.push({
          type: 'info',
          category: 'Status',
          message: 'Tidak ada masalah integritas data yang ditemukan'
        });
      }

      setIssues(foundIssues);
      setLastChecked(new Date());
    } catch (error) {
      console.error('Error running integrity check:', error);
      setIssues([{
        type: 'error',
        category: 'System',
        message: 'Gagal menjalankan pemeriksaan integritas data'
      }]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runIntegrityCheck();
  }, []);

  const getIssueIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <FiAlertTriangle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <FiAlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <FiCheckCircle className="h-4 w-4 text-green-500" />;
    }
  };

  const getIssueColor = (type: string) => {
    switch (type) {
      case 'error':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200';
      case 'warning':
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200';
      default:
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
          <FiDatabase className="mr-2 h-5 w-5" />
          Pemeriksaan Integritas Database
        </h3>
        <button
          onClick={runIntegrityCheck}
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
        >
          <FiRefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Memeriksa...' : 'Periksa Ulang'}
        </button>
      </div>

      {lastChecked && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Terakhir diperiksa: {lastChecked.toLocaleString('id-ID')}
        </p>
      )}

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center">
              <FiUsers className="h-4 w-4 text-blue-500 mr-2" />
              <div>
                <p className="text-xs text-blue-600 dark:text-blue-400">Total Pelanggan</p>
                <p className="text-lg font-bold text-blue-800 dark:text-blue-200">{stats.totalCustomers}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-center">
              <FiDroplet className="h-4 w-4 text-green-500 mr-2" />
              <div>
                <p className="text-xs text-green-600 dark:text-green-400">Total Pembacaan</p>
                <p className="text-lg font-bold text-green-800 dark:text-green-200">{stats.totalReadings}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-center">
              <FiAlertTriangle className="h-4 w-4 text-yellow-500 mr-2" />
              <div>
                <p className="text-xs text-yellow-600 dark:text-yellow-400">Tanpa Data</p>
                <p className="text-lg font-bold text-yellow-800 dark:text-yellow-200">{stats.customersWithoutReadings}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg border border-purple-200 dark:border-purple-800">
            <div className="flex items-center">
              <FiCalendar className="h-4 w-4 text-purple-500 mr-2" />
              <div>
                <p className="text-xs text-purple-600 dark:text-purple-400">Bulan Aktif</p>
                <p className="text-lg font-bold text-purple-800 dark:text-purple-200">{Object.keys(stats.monthlyReadingDistribution).length}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Issues */}
      <div className="space-y-3">
        {issues.map((issue, index) => (
          <div key={index} className={`p-4 rounded-lg border ${getIssueColor(issue.type)}`}>
            <div className="flex items-start">
              {getIssueIcon(issue.type)}
              <div className="ml-3 flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">{issue.category}</h4>
                  {issue.count && (
                    <span className="text-sm font-medium">{issue.count} item</span>
                  )}
                </div>
                <p className="text-sm mt-1">{issue.message}</p>
                {issue.details && issue.details.length > 0 && (
                  <details className="mt-2">
                    <summary className="text-sm cursor-pointer hover:underline">
                      Lihat detail ({issue.details.length} item)
                    </summary>
                    <ul className="mt-2 text-xs space-y-1 ml-4">
                      {issue.details.map((detail, detailIndex) => (
                        <li key={detailIndex} className="list-disc">{detail}</li>
                      ))}
                      {issue.count && issue.count > issue.details.length && (
                        <li className="italic">...dan {issue.count - issue.details.length} lainnya</li>
                      )}
                    </ul>
                  </details>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}