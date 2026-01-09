'use client';

import React, { useState } from 'react';
import { FinancialReport, DateRange, Transaction, TransactionCategory, CategorySummary } from '@/types/financial';
import ReportSummary from './ReportSummary';
import { formatDateID } from '@/utils/dateFormat';

const ReportingDemo: React.FC = () => {
  const [showReport, setShowReport] = useState(false);

  // Mock data for demonstration
  const mockCategories: TransactionCategory[] = [
    {
      id: '1',
      name: 'Water Billing',
      type: 'income',
      description: 'Revenue from monthly water billing',
      is_active: true,
      created_at: new Date()
    },
    {
      id: '2',
      name: 'Late Fees',
      type: 'income',
      description: 'Penalties for late payment',
      is_active: true,
      created_at: new Date()
    },
    {
      id: '3',
      name: 'Maintenance',
      type: 'expense',
      description: 'Equipment and infrastructure maintenance',
      is_active: true,
      created_at: new Date()
    },
    {
      id: '4',
      name: 'Equipment',
      type: 'expense',
      description: 'Purchase of meters, pipes, and tools',
      is_active: true,
      created_at: new Date()
    }
  ];

  const mockTransactions: Transaction[] = [
    {
      id: '1',
      type: 'income',
      amount: 2500000,
      date: new Date('2024-01-15'),
      category_id: '1',
      category: mockCategories[0],
      description: 'Monthly water billing - January 2024',
      created_at: new Date(),
      updated_at: new Date(),
      created_by: 'admin@example.com'
    },
    {
      id: '2',
      type: 'income',
      amount: 150000,
      date: new Date('2024-01-20'),
      category_id: '2',
      category: mockCategories[1],
      description: 'Late payment fees',
      created_at: new Date(),
      updated_at: new Date(),
      created_by: 'admin@example.com'
    },
    {
      id: '3',
      type: 'expense',
      amount: 800000,
      date: new Date('2024-01-10'),
      category_id: '3',
      category: mockCategories[2],
      description: 'Pipe maintenance and repairs',
      created_at: new Date(),
      updated_at: new Date(),
      created_by: 'admin@example.com'
    },
    {
      id: '4',
      type: 'expense',
      amount: 450000,
      date: new Date('2024-01-25'),
      category_id: '4',
      category: mockCategories[3],
      description: 'New water meters purchase',
      created_at: new Date(),
      updated_at: new Date(),
      created_by: 'admin@example.com'
    }
  ];

  const generateMockReport = (): FinancialReport => {
    const totalIncome = mockTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = mockTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const netProfit = totalIncome - totalExpenses;

    // Calculate category summaries
    const incomeByCategoryMap = new Map<string, CategorySummary>();
    const expensesByCategoryMap = new Map<string, CategorySummary>();

    mockTransactions.forEach(transaction => {
      const categoryMap = transaction.type === 'income' ? incomeByCategoryMap : expensesByCategoryMap;
      const total = transaction.type === 'income' ? totalIncome : totalExpenses;
      
      if (!categoryMap.has(transaction.category_id)) {
        categoryMap.set(transaction.category_id, {
          category: transaction.category,
          total_amount: 0,
          transaction_count: 0,
          percentage_of_total: 0
        });
      }

      const summary = categoryMap.get(transaction.category_id)!;
      summary.total_amount += transaction.amount;
      summary.transaction_count += 1;
      summary.percentage_of_total = total > 0 ? (summary.total_amount / total) * 100 : 0;
    });

    return {
      period: {
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-01-31')
      },
      summary: {
        total_income: totalIncome,
        total_expenses: totalExpenses,
        net_profit: netProfit
      },
      income_by_category: Array.from(incomeByCategoryMap.values()),
      expenses_by_category: Array.from(expensesByCategoryMap.values()),
      transactions: mockTransactions,
      generated_at: new Date()
    };
  };

  const mockReport = generateMockReport();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
        Demo Sistem Laporan Keuangan
      </h2>

      <div className="mb-6">
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Ini adalah demo sistem laporan keuangan dengan data contoh. Sistem ini menampilkan:
        </p>
        <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-1 mb-6">
          <li>Ringkasan keuangan (total pemasukan, pengeluaran, keuntungan bersih)</li>
          <li>Breakdown per kategori dengan persentase</li>
          <li>Validasi subtotal kategori</li>
          <li>Format mata uang dan tanggal Indonesia</li>
          <li>Tampilan responsif untuk mobile dan desktop</li>
        </ul>

        <button
          onClick={() => setShowReport(!showReport)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          {showReport ? 'Sembunyikan Laporan' : 'Tampilkan Laporan Demo'}
        </button>
      </div>

      {showReport && (
        <div className="border-t border-gray-200 dark:border-gray-600 pt-6">
          <ReportSummary report={mockReport} />
          
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
              📊 Data Demo
            </h4>
            <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <p>• Total Transaksi: {mockTransactions.length}</p>
              <p>• Periode: {formatDateID(mockReport.period.start_date)} - {formatDateID(mockReport.period.end_date)}</p>
              <p>• Kategori: {mockCategories.length} (2 pemasukan, 2 pengeluaran)</p>
              <p>• Validasi: Subtotal kategori sesuai dengan total keseluruhan</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportingDemo;