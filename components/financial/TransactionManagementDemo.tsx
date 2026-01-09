import { useState, useEffect } from 'react';
import { Transaction, TransactionCategory, TransactionInput, TransactionFilters } from '@/types/financial';
import { FinancialService } from '@/lib/financialService';
import TransactionList from './TransactionList';
import EditTransactionModal from './EditTransactionModal';
import DeleteConfirmationDialog from './DeleteConfirmationDialog';
import FilterPanel from './FilterPanel';

export default function TransactionManagementDemo() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<TransactionCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [filters, setFilters] = useState<TransactionFilters>({
    type: 'all',
    category_ids: [],
    search_term: '',
    sort_by: 'date',
    sort_order: 'desc'
  });

  const financialService = new FinancialService();

  useEffect(() => {
    loadData();
  }, []);

  // Apply filters whenever transactions or filters change
  useEffect(() => {
    applyFilters();
  }, [transactions, filters]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [transactionsData, categoriesData] = await Promise.all([
        financialService.getTransactions(),
        financialService.getCategories()
      ]);
      setTransactions(transactionsData);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...transactions];

    // Apply type filter
    if (filters.type && filters.type !== 'all') {
      filtered = filtered.filter(t => t.type === filters.type);
    }

    // Apply category filter
    if (filters.category_ids && filters.category_ids.length > 0) {
      filtered = filtered.filter(t => filters.category_ids!.includes(t.category_id));
    }

    // Apply date range filters
    if (filters.date_from) {
      filtered = filtered.filter(t => t.date >= filters.date_from!);
    }

    if (filters.date_to) {
      // Set end of day for date_to to include the entire day
      const endOfDay = new Date(filters.date_to);
      endOfDay.setHours(23, 59, 59, 999);
      filtered = filtered.filter(t => t.date <= endOfDay);
    }

    // Apply search filter
    if (filters.search_term && filters.search_term.trim() !== '') {
      const searchTerm = filters.search_term.toLowerCase().trim();
      filtered = filtered.filter(t => 
        t.description.toLowerCase().includes(searchTerm)
      );
    }

    // Apply sorting
    const sortBy = filters.sort_by || 'date';
    const sortOrder = filters.sort_order || 'desc';
    
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortBy) {
        case 'amount':
          aValue = a.amount;
          bValue = b.amount;
          break;
        case 'category':
          aValue = a.category.name.toLowerCase();
          bValue = b.category.name.toLowerCase();
          break;
        case 'date':
        default:
          aValue = a.date.getTime();
          bValue = b.date.getTime();
          break;
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    setFilteredTransactions(filtered);
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsEditModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    const transaction = transactions.find(t => t.id === id);
    if (transaction) {
      setDeletingTransaction(transaction);
      setIsDeleteDialogOpen(true);
    }
  };

  const handleSaveEdit = async (id: string, updates: Partial<TransactionInput>) => {
    try {
      const updatedTransaction = await financialService.updateTransaction(id, updates);
      setTransactions(prev => 
        prev.map(t => t.id === id ? updatedTransaction : t)
      );
    } catch (error) {
      console.error('Error updating transaction:', error);
      throw error;
    }
  };

  const handleConfirmDelete = async (id: string) => {
    try {
      await financialService.deleteTransaction(id);
      setTransactions(prev => prev.filter(t => t.id !== id));
    } catch (error) {
      console.error('Error deleting transaction:', error);
      throw error;
    }
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingTransaction(null);
  };

  const handleCloseDeleteDialog = () => {
    setIsDeleteDialogOpen(false);
    setDeletingTransaction(null);
  };

  const handleFiltersChange = (newFilters: TransactionFilters) => {
    setFilters(newFilters);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Transaction Management with Filtering
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          This demo shows the transaction list with filtering, search, and management functionality.
        </p>
      </div>

      <FilterPanel
        filters={filters}
        onFiltersChange={handleFiltersChange}
        categories={categories}
      />
        
      <TransactionList
        transactions={filteredTransactions}
        onEdit={handleEdit}
        onDelete={handleDelete}
        loading={loading}
      />

      <EditTransactionModal
        transaction={editingTransaction}
        categories={categories}
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        onSave={handleSaveEdit}
      />

      <DeleteConfirmationDialog
        transaction={deletingTransaction}
        isOpen={isDeleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}