'use client';

import { useState, useEffect } from 'react';
import { FiUsers, FiDroplet, FiDollarSign, FiTrendingUp, FiCheck, FiClock, FiAlertCircle, FiRefreshCw } from 'react-icons/fi';
import { DashboardMetrics, RTPaymentStatus } from '@/types/types';
import { dashboardService } from '@/lib/dashboardService';
import { formatDateID } from '@/utils/dateFormat';

interface DashboardMetricsProps {
  className?: string;
}

export default function DashboardMetricsComponent({ className = '' }: DashboardMetricsProps) {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<{ month: number; year: number; monthName: string } | null>(null);

  useEffect(() => {
    loadMetrics();
    // Set billing period info
    setBillingPeriod(dashboardService.getCurrentBillingPeriod());
  }, []);

  const loadMetrics = async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);
      
      // Clear cache if force refresh
      if (forceRefresh) {
        dashboardService.clearCache();
      }
      
      // Try to create RT categories and expense categories first, but don't let it fail the whole process
      try {
        await Promise.all([
          dashboardService.createRTIncomeCategories(),
          dashboardService.createExpenseCategories()
        ]);
      } catch (categoryError) {
        console.warn('Failed to create categories, continuing without them:', categoryError);
      }
      
      // Load metrics
      const data = await dashboardService.getDashboardMetrics();
      setMetrics(data);
    } catch (err) {
      console.error('Error loading dashboard metrics:', err);
      setError('Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getPaymentStatusColor = (status: RTPaymentStatus['paymentStatus']) => {
    switch (status) {
      case 'paid':
        return 'text-green-600 dark:text-green-400';
      case 'partial':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'pending':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getPaymentStatusIcon = (status: RTPaymentStatus['paymentStatus']) => {
    switch (status) {
      case 'paid':
        return <FiCheck className="h-4 w-4" />;
      case 'partial':
        return <FiClock className="h-4 w-4" />;
      case 'pending':
        return <FiAlertCircle className="h-4 w-4" />;
      default:
        return <FiClock className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        {/* Loading skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="animate-pulse">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gray-300 dark:bg-gray-600 rounded-xl"></div>
                  <div className="ml-4 space-y-2">
                    <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-24"></div>
                    <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-16"></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 ${className}`}>
        <div className="flex items-center">
          <FiAlertCircle className="h-5 w-5 text-red-500 dark:text-red-400 mr-3" />
          <div>
            <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Error Loading Metrics</h3>
            <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
            <button
              onClick={() => loadMetrics()}
              className="mt-2 text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 underline"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!metrics) return null;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with billing period and refresh button */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Dashboard Overview</h2>
          {billingPeriod && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Periode Tagihan: {billingPeriod.monthName} {billingPeriod.year}
            </p>
          )}
        </div>
        <button
          onClick={() => loadMetrics(true)}
          disabled={loading}
          className="flex items-center px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors duration-200"
        >
          <FiRefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Main Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Customers */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white">
              <FiUsers className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Customers</h3>
              <p className="text-xl font-semibold text-gray-900 dark:text-white">{metrics.totalCustomers}</p>
            </div>
          </div>
        </div>

        {/* Monthly Usage */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600 text-white">
              <FiDroplet className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Pemakaian Bulan Lalu</h3>
              <p className="text-xl font-semibold text-gray-900 dark:text-white">{metrics.monthlyUsage.toLocaleString('id-ID')} m³</p>
            </div>
          </div>
        </div>

        {/* Monthly Total Bill */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-3 rounded-xl bg-gradient-to-br from-green-500 to-green-600 text-white">
              <FiDollarSign className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Tagihan</h3>
              <p className="text-xl font-semibold text-gray-900 dark:text-white">{formatCurrency(metrics.monthlyTotalBill)}</p>
            </div>
          </div>
        </div>

        {/* Monthly Income */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 text-white">
              <FiTrendingUp className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Uang Terkumpul</h3>
              <p className="text-xl font-semibold text-gray-900 dark:text-white">{formatCurrency(metrics.monthlyIncome)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Combined RT Billing & Payment Status */}
      {(metrics.rtTotalBills.length > 0 || metrics.rtPaymentStatus.length > 0) && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Tagihan & Status Pembayaran RT - {billingPeriod?.monthName} {billingPeriod?.year}
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      RT
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Pelanggan
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Pemakaian
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Total Tagihan
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Terbayar
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Sisa
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status Pembayaran
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status Pembacaan
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {metrics.rtTotalBills.map((rtBill) => {
                    // Find corresponding payment status
                    const paymentStatus = metrics.rtPaymentStatus.find(rt => rt.rt === rtBill.rt);
                    
                    // Calculate sisa (remaining) from total bill and paid amount
                    const paidAmount = paymentStatus?.paidAmount || 0;
                    const remainingAmount = Math.max(0, rtBill.totalBill - paidAmount);
                    
                    return (
                      <tr key={rtBill.rt} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          {rtBill.rt}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {rtBill.customerCount}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {rtBill.totalUsage.toLocaleString('id-ID')} m³
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(rtBill.totalBill)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-green-600 dark:text-green-400 font-medium">
                          {formatCurrency(paidAmount)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-red-600 dark:text-red-400 font-medium">
                          {formatCurrency(remainingAmount)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          {paymentStatus ? (
                            <div className={`flex items-center ${getPaymentStatusColor(paymentStatus.paymentStatus)}`}>
                              {getPaymentStatusIcon(paymentStatus.paymentStatus)}
                              <span className="ml-2 text-xs font-medium capitalize">
                                {paymentStatus.paymentStatus === 'paid' && 'Lunas'}
                                {paymentStatus.paymentStatus === 'partial' && 'Sebagian'}
                                {paymentStatus.paymentStatus === 'pending' && 'Belum'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-500 dark:text-gray-400">Belum</span>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          {rtBill.hasAllReadings ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                              <FiCheck className="h-3 w-3 mr-1" />
                              Lengkap
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                              <FiAlertCircle className="h-3 w-3 mr-1" />
                              {rtBill.missingReadings.length} belum
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-4 text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <p><strong>Keterangan:</strong></p>
              <p>• <strong>Total Tagihan:</strong> Jumlah yang harus dikumpulkan dari seluruh pelanggan di RT</p>
              <p>• <strong>Terbayar:</strong> Jumlah uang yang sudah diterima dari RT</p>
              <p>• <strong>Sisa:</strong> Jumlah uang yang masih harus dikumpulkan</p>
              <p>• <strong>Status Pembayaran:</strong> Lunas (100%), Sebagian (1-99%), Belum (0%)</p>
              <p>• <strong>Status Pembacaan:</strong> Lengkap (semua pelanggan sudah dibaca), X belum (masih ada yang belum dibaca)</p>
            </div>
          </div>
        </div>
      )}

      {/* Collection Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {metrics.rtPaymentStatus.filter(rt => rt.paymentStatus === 'paid').length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">RTs Paid</div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {metrics.rtPaymentStatus.filter(rt => rt.paymentStatus === 'partial').length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">RTs Partial</div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {metrics.rtPaymentStatus.filter(rt => rt.paymentStatus === 'pending').length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">RTs Pending</div>
          </div>
        </div>
      </div>
    </div>
  );
}