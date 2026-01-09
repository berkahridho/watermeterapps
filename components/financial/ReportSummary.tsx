'use client';

import React from 'react';
import { FinancialReport, CategorySummary } from '@/types/financial';
import { formatDateID } from '@/utils/dateFormat';

interface ReportSummaryProps {
  report: FinancialReport;
}

const ReportSummary: React.FC<ReportSummaryProps> = ({ report }) => {
  const formatCurrency = (amount: number): string => {
    return `Rp ${amount.toLocaleString('id-ID')}`;
  };

  const formatPercentage = (percentage: number): string => {
    return `${percentage.toFixed(1)}%`;
  };

  const renderCategorySummary = (
    categories: CategorySummary[],
    title: string,
    colorClass: string
  ) => {
    if (categories.length === 0) {
      return (
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 dark:text-white mb-2">{title}</h4>
          <p className="text-gray-500 dark:text-gray-400">Tidak ada data untuk periode ini</p>
        </div>
      );
    }

    return (
      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 dark:text-white mb-4">{title}</h4>
        <div className="space-y-3">
          {categories.map((category) => (
            <div key={category.category.id} className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {category.category.name}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {formatPercentage(category.percentage_of_total)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    {formatCurrency(category.total_amount)}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {category.transaction_count} transaksi
                  </span>
                </div>
                {/* Progress bar */}
                <div className="mt-2 w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${colorClass}`}
                    style={{ width: `${Math.min(category.percentage_of_total, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Report Header */}
      <div className="border-b border-gray-200 dark:border-gray-600 pb-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Ringkasan Laporan Keuangan
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Periode: {formatDateID(report.period.start_date)} - {formatDateID(report.period.end_date)}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Dibuat pada: {formatDateID(report.generated_at)} {report.generated_at.toLocaleTimeString('id-ID')}
        </p>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Income */}
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-green-600 dark:text-green-400">
                Total Pemasukan
              </p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                {formatCurrency(report.summary.total_income)}
              </p>
            </div>
          </div>
        </div>

        {/* Total Expenses */}
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-red-600 dark:text-red-400">
                Total Pengeluaran
              </p>
              <p className="text-2xl font-bold text-red-900 dark:text-red-100">
                {formatCurrency(report.summary.total_expenses)}
              </p>
            </div>
          </div>
        </div>

        {/* Net Profit */}
        <div className={`${
          report.summary.net_profit >= 0 
            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' 
            : 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
        } border rounded-lg p-6`}>
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className={`w-8 h-8 ${
                report.summary.net_profit >= 0 
                  ? 'text-blue-600 dark:text-blue-400' 
                  : 'text-orange-600 dark:text-orange-400'
              }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className={`text-sm font-medium ${
                report.summary.net_profit >= 0 
                  ? 'text-blue-600 dark:text-blue-400' 
                  : 'text-orange-600 dark:text-orange-400'
              }`}>
                {report.summary.net_profit >= 0 ? 'Keuntungan Bersih' : 'Kerugian Bersih'}
              </p>
              <p className={`text-2xl font-bold ${
                report.summary.net_profit >= 0 
                  ? 'text-blue-900 dark:text-blue-100' 
                  : 'text-orange-900 dark:text-orange-100'
              }`}>
                {formatCurrency(Math.abs(report.summary.net_profit))}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income by Category */}
        {renderCategorySummary(
          report.income_by_category,
          'Pemasukan per Kategori',
          'bg-green-500'
        )}

        {/* Expenses by Category */}
        {renderCategorySummary(
          report.expenses_by_category,
          'Pengeluaran per Kategori',
          'bg-red-500'
        )}
      </div>

      {/* Transaction Summary */}
      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 dark:text-white mb-2">
          Ringkasan Transaksi
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {report.transactions.length}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Total Transaksi
            </p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {report.transactions.filter(t => t.type === 'income').length}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Pemasukan
            </p>
          </div>
          <div>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
              {report.transactions.filter(t => t.type === 'expense').length}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Pengeluaran
            </p>
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {report.income_by_category.length + report.expenses_by_category.length}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Kategori Aktif
            </p>
          </div>
        </div>
      </div>

      {/* Validation Summary */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
          Validasi Laporan
        </h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-blue-700 dark:text-blue-300">
              Total Pemasukan (Kategori):
            </span>
            <span className="font-medium text-blue-900 dark:text-blue-100">
              {formatCurrency(report.income_by_category.reduce((sum, cat) => sum + cat.total_amount, 0))}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-blue-700 dark:text-blue-300">
              Total Pengeluaran (Kategori):
            </span>
            <span className="font-medium text-blue-900 dark:text-blue-100">
              {formatCurrency(report.expenses_by_category.reduce((sum, cat) => sum + cat.total_amount, 0))}
            </span>
          </div>
          <div className="flex justify-between border-t border-blue-200 dark:border-blue-700 pt-2">
            <span className="text-blue-700 dark:text-blue-300">
              Status Validasi:
            </span>
            <span className={`font-medium ${
              Math.abs(report.summary.total_income - report.income_by_category.reduce((sum, cat) => sum + cat.total_amount, 0)) < 0.01 &&
              Math.abs(report.summary.total_expenses - report.expenses_by_category.reduce((sum, cat) => sum + cat.total_amount, 0)) < 0.01
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            }`}>
              {Math.abs(report.summary.total_income - report.income_by_category.reduce((sum, cat) => sum + cat.total_amount, 0)) < 0.01 &&
               Math.abs(report.summary.total_expenses - report.expenses_by_category.reduce((sum, cat) => sum + cat.total_amount, 0)) < 0.01
                ? '✓ Valid'
                : '⚠ Tidak Valid'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportSummary;