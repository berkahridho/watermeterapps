'use client';

import React, { useState, useEffect } from 'react';
import { Transaction, DateRange, TransactionFilters } from '@/types/financial';
import { FinancialService } from '@/lib/financialService';
import { FiDollarSign, FiTrendingUp, FiTrendingDown, FiBarChart, FiPlus } from 'react-icons/fi';
import TransactionForm from './TransactionForm';
import TransactionList from './TransactionList';
import FilterPanel from './FilterPanel';
import ReportGenerator from './ReportGenerator';
import EditTransactionModal from './EditTransactionModal';
import DeleteConfirmationDialog from './DeleteConfirmationDialog';
import DuplicateWarningDialog from './DuplicateWarningDialog';

interface FinancialDashboardProps {
  initialTransactions?: Transaction[];
  userRole: 'admin' | 'user';
}

const FinancialDashboard: React.FC<FinancialDashboardProps> = ({
  initialTransactions = [],
  userRole
}) => {
  const [activeTab, setActiveTab] = useState<'transactions' | 'reports'>('transactions');
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>(initialTransactions);
  const [loading, setLoading] = useState(false);
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<{
    transaction: any;
    duplicates: Transaction[];
  } | null>(null);
  
  const [filters, setFilters] = useState<TransactionFilters>({
    type: 'all',
    category_ids: [],
    date_from: undefined,
    date_to: undefined,
    search_term: '',
    sort_by: 'date',
    sort_order: 'desc'
  });

  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    return {
      start_date: startOfMonth,
      end_date: endOfMonth
    };
  });

  const financialService = new FinancialService();

  // Load transactions on component mount
  useEffect(() => {
    loadTransactions();
  }, []);

  // Apply filters when transactions or filters change
  useEffect(() => {
    applyFilters();
  }, [transactions, filters]);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const data = await financialService.getTransactions();
      setTransactions(data);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...transactions];

    // Type filter
    if (filters.type && filters.type !== 'all') {
      filtered = filtered.filter(t => t.type === filters.type);
    }

    // Category filter
    if (filters.category_ids && filters.category_ids.length > 0) {
      filtered = filtered.filter(t => filters.category_ids!.includes(t.category_id));
    }

    // Date range filter
    if (filters.date_from) {
      filtered = filtered.filter(t => new Date(t.date) >= filters.date_from!);
    }
    if (filters.date_to) {
      filtered = filtered.filter(t => new Date(t.date) <= filters.date_to!);
    }

    // Search filter
    if (filters.search_term) {
      const searchTerm = filters.search_term.toLowerCase();
      filtered = filtered.filter(t => 
        t.description.toLowerCase().includes(searchTerm) ||
        t.category.name.toLowerCase().includes(searchTerm)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (filters.sort_by) {
        case 'amount':
          aValue = a.amount;
          bValue = b.amount;
          break;
        case 'category':
          aValue = a.category.name;
          bValue = b.category.name;
          break;
        case 'date':
        default:
          aValue = new Date(a.date);
          bValue = new Date(b.date);
          break;
      }

      if (filters.sort_order === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredTransactions(filtered);
  };

  const handleCreateTransaction = async (transactionData: any) => {
    try {
      // Check for duplicates
      const duplicates = await financialService.checkDuplicateTransaction(transactionData);
      
      if (duplicates.length > 0) {
        setDuplicateWarning({ transaction: transactionData, duplicates });
        return;
      }

      const newTransaction = await financialService.createTransaction(transactionData);
      setTransactions(prev => [newTransaction, ...prev]);
      setShowTransactionForm(false);
    } catch (error) {
      console.error('Error creating transaction:', error);
      throw error;
    }
  };

  const handleUpdateTransaction = async (id: string, updates: any) => {
    try {
      const updatedTransaction = await financialService.updateTransaction(id, updates);
      setTransactions(prev => prev.map(t => t.id === id ? updatedTransaction : t));
      setEditingTransaction(null);
    } catch (error) {
      console.error('Error updating transaction:', error);
      throw error;
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    try {
      await financialService.deleteTransaction(id);
      setTransactions(prev => prev.filter(t => t.id !== id));
      setDeletingTransaction(null);
    } catch (error) {
      console.error('Error deleting transaction:', error);
      throw error;
    }
  };

  const handleDuplicateConfirm = async () => {
    if (!duplicateWarning) return;
    
    try {
      const newTransaction = await financialService.createTransaction(duplicateWarning.transaction);
      setTransactions(prev => [newTransaction, ...prev]);
      setDuplicateWarning(null);
      setShowTransactionForm(false);
    } catch (error) {
      console.error('Error creating transaction:', error);
    }
  };

  const handleExport = async (format: 'pdf' | 'csv') => {
    console.log(`Exporting financial report as ${format.toUpperCase()}`);
    // Export logic is handled by ReportGenerator component
  };

  const handleDateRangeChange = (newRange: DateRange) => {
    setDateRange(newRange);
  };

  // Calculate summary statistics
  const totalIncome = filteredTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalExpenses = filteredTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const netProfit = totalIncome - totalExpenses;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Sistem Keuangan
          </h1>
          <p className="mt-2 text-sm sm:text-base text-gray-600 dark:text-gray-400">
            Kelola pemasukan dan pengeluaran untuk sistem monitoring meter air
          </p>
        </div>

        {/* Summary Cards - Mobile Responsive */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 sm:mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FiTrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
              </div>
              <div className="ml-4 flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                  Total Pemasukan
                </p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">
                  Rp {totalIncome.toLocaleString('id-ID')}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FiTrendingDown className="h-6 w-6 sm:h-8 sm:w-8 text-red-600" />
              </div>
              <div className="ml-4 flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                  Total Pengeluaran
                </p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">
                  Rp {totalExpenses.toLocaleString('id-ID')}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FiDollarSign className={`h-6 w-6 sm:h-8 sm:w-8 ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`} />
              </div>
              <div className="ml-4 flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                  Keuntungan Bersih
                </p>
                <p className={`text-lg sm:text-2xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  Rp {netProfit.toLocaleString('id-ID')}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FiBarChart className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
              </div>
              <div className="ml-4 flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                  Total Transaksi
                </p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">
                  {filteredTransactions.length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation - Mobile Responsive */}
        <div className="mb-6 sm:mb-8">
          <nav className="flex space-x-4 sm:space-x-8 overflow-x-auto" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('transactions')}
              className={`${
                activeTab === 'transactions'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm sm:text-base flex-shrink-0`}
            >
              Manajemen Transaksi
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`${
                activeTab === 'reports'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm sm:text-base flex-shrink-0`}
            >
              Laporan Keuangan
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="space-y-6 sm:space-y-8">
          {activeTab === 'transactions' && (
            <div className="space-y-6">
              {/* Action Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex-1">
                  <FilterPanel
                    filters={filters}
                    onFiltersChange={setFilters}
                    categories={[]} // Categories will be loaded by FilterPanel
                  />
                </div>
                <div className="flex-shrink-0">
                  <button
                    onClick={() => setShowTransactionForm(true)}
                    className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <FiPlus className="h-4 w-4" />
                    <span className="sm:hidden">Tambah Transaksi</span>
                    <span className="hidden sm:inline">Tambah Transaksi Baru</span>
                  </button>
                </div>
              </div>

              {/* Transaction List */}
              <TransactionList
                transactions={filteredTransactions}
                onEdit={setEditingTransaction}
                onDelete={async (id: string) => {
                  const transaction = filteredTransactions.find(t => t.id === id);
                  if (transaction) {
                    setDeletingTransaction(transaction);
                  }
                }}
                loading={loading}
              />
            </div>
          )}

          {activeTab === 'reports' && (
            <div>
              <ReportGenerator
                dateRange={dateRange}
                onDateRangeChange={handleDateRangeChange}
                onExport={handleExport}
              />
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showTransactionForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Tambah Transaksi Baru
              </h2>
              <TransactionForm
                onSubmit={handleCreateTransaction}
                onCancel={() => setShowTransactionForm(false)}
              />
            </div>
          </div>
        </div>
      )}

      {editingTransaction && (
        <EditTransactionModal
          transaction={editingTransaction}
          categories={[]} // Categories will be loaded by the modal
          isOpen={true}
          onClose={() => setEditingTransaction(null)}
          onSave={handleUpdateTransaction}
        />
      )}

      {deletingTransaction && (
        <DeleteConfirmationDialog
          transaction={deletingTransaction}
          isOpen={true}
          onClose={() => setDeletingTransaction(null)}
          onConfirm={() => handleDeleteTransaction(deletingTransaction.id)}
        />
      )}

      {duplicateWarning && (
        <DuplicateWarningDialog
          isOpen={true}
          onClose={() => setDuplicateWarning(null)}
          onConfirm={handleDuplicateConfirm}
          duplicateTransactions={duplicateWarning.duplicates}
          newTransaction={duplicateWarning.transaction}
        />
      )}
    </div>
  );
};

export default FinancialDashboard;