import { supabase } from './supabase';
import {
  Transaction,
  TransactionInput,
  TransactionCategory,
  TransactionFilters,
  FinancialReport,
  CategorySummary,
  TransactionRow,
  TransactionCategoryRow,
  DateRange,
  AuditLog,
  AuditLogRow
} from '@/types/financial';

export class FinancialService {
  /**
   * Create a new financial transaction
   */
  async createTransaction(transaction: TransactionInput): Promise<Transaction> {
    try {
      // Get current user for audit trail
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const transactionData = {
        type: transaction.type,
        amount: transaction.amount,
        date: transaction.date.toISOString().split('T')[0], // Convert to YYYY-MM-DD format
        category_id: transaction.category_id,
        description: transaction.description,
        created_by: user.email || user.id,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('financial_transactions')
        .insert([transactionData])
        .select(`
          *,
          category:transaction_categories(*)
        `)
        .single();

      if (error) {
        throw error;
      }

      return this.mapTransactionRowToTransaction(data);
    } catch (error) {
      console.error('Error creating transaction:', error);
      throw error;
    }
  }

  /**
   * Update an existing financial transaction
   */
  async updateTransaction(id: string, updates: Partial<TransactionInput>): Promise<Transaction> {
    try {
      // Get current user for audit trail
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const updateData: any = {
        updated_at: new Date().toISOString(),
        updated_by: user.email || user.id
      };

      // Only include fields that are being updated
      if (updates.type !== undefined) updateData.type = updates.type;
      if (updates.amount !== undefined) updateData.amount = updates.amount;
      if (updates.date !== undefined) updateData.date = updates.date.toISOString().split('T')[0];
      if (updates.category_id !== undefined) updateData.category_id = updates.category_id;
      if (updates.description !== undefined) updateData.description = updates.description;

      const { data, error } = await supabase
        .from('financial_transactions')
        .update(updateData)
        .eq('id', id)
        .select(`
          *,
          category:transaction_categories(*)
        `)
        .single();

      if (error) {
        throw error;
      }

      return this.mapTransactionRowToTransaction(data);
    } catch (error) {
      console.error('Error updating transaction:', error);
      throw error;
    }
  }

  /**
   * Delete a financial transaction
   */
  async deleteTransaction(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('financial_transactions')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error deleting transaction:', error);
      throw error;
    }
  }

  /**
   * Get transactions with optional filtering
   */
  async getTransactions(filters?: TransactionFilters): Promise<Transaction[]> {
    try {
      let query = supabase
        .from('financial_transactions')
        .select(`
          *,
          category:transaction_categories(*)
        `);

      // Apply filters
      if (filters) {
        if (filters.type && filters.type !== 'all') {
          query = query.eq('type', filters.type);
        }

        if (filters.category_ids && filters.category_ids.length > 0) {
          query = query.in('category_id', filters.category_ids);
        }

        if (filters.date_from) {
          query = query.gte('date', filters.date_from.toISOString().split('T')[0]);
        }

        if (filters.date_to) {
          query = query.lte('date', filters.date_to.toISOString().split('T')[0]);
        }

        if (filters.search_term) {
          query = query.ilike('description', `%${filters.search_term}%`);
        }

        // Apply sorting
        const sortBy = filters.sort_by || 'date';
        const sortOrder = filters.sort_order === 'asc';
        query = query.order(sortBy, { ascending: sortOrder });

        // Apply pagination
        if (filters.limit) {
          query = query.limit(filters.limit);
        }

        if (filters.page && filters.limit) {
          const offset = (filters.page - 1) * filters.limit;
          query = query.range(offset, offset + filters.limit - 1);
        }
      } else {
        // Default sorting: newest first
        query = query.order('date', { ascending: false });
      }

      const { data, error } = await query;

      if (error) {
        // If financial tables don't exist, return empty array
        if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
          console.warn('Financial tables not found - working without financial data');
          return [];
        }
        throw error;
      }

      return data?.map(row => this.mapTransactionRowToTransaction(row)) || [];
    } catch (error) {
      // If financial tables don't exist, return empty array instead of throwing
      if (error && typeof error === 'object' && 'code' in error) {
        if (error.code === 'PGRST116' || (error as any).message?.includes('does not exist')) {
          console.warn('Financial tables not found - returning empty transactions list');
          return [];
        }
      }
      console.warn('Error fetching transactions (non-critical):', error);
      return [];
    }
  }

  /**
   * Get a single transaction by ID
   */
  async getTransactionById(id: string): Promise<Transaction | null> {
    try {
      const { data, error } = await supabase
        .from('financial_transactions')
        .select(`
          *,
          category:transaction_categories(*)
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // No rows returned
        }
        throw error;
      }

      return this.mapTransactionRowToTransaction(data);
    } catch (error) {
      // If financial tables don't exist, return null
      if (error && typeof error === 'object' && 'code' in error) {
        if (error.code === 'PGRST116' || (error as any).message?.includes('does not exist')) {
          console.warn('Financial transactions table not found - returning null for transaction');
          return null;
        }
      }
      console.warn('Error fetching transaction by ID (non-critical):', error);
      return null;
    }
  }

  /**
   * Get all transaction categories
   */
  async getCategories(): Promise<TransactionCategory[]> {
    try {
      const { data, error } = await supabase
        .from('transaction_categories')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) {
        // If financial tables don't exist, return empty array
        if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
          console.warn('Transaction categories table not found - working without categories');
          return [];
        }
        throw error;
      }

      return data?.map(row => this.mapCategoryRowToCategory(row)) || [];
    } catch (error) {
      // If financial tables don't exist, return empty array instead of throwing
      if (error && typeof error === 'object' && 'code' in error) {
        if (error.code === 'PGRST116' || (error as any).message?.includes('does not exist')) {
          console.warn('Transaction categories table not found - returning empty categories list');
          return [];
        }
      }
      console.warn('Error fetching categories (non-critical):', error);
      return [];
    }
  }

  /**
   * Get transaction categories filtered by type
   */
  async getCategoriesByType(type: 'income' | 'expense'): Promise<TransactionCategory[]> {
    try {
      const { data, error } = await supabase
        .from('transaction_categories')
        .select('*')
        .eq('type', type)
        .eq('is_active', true)
        .order('name');

      if (error) {
        // If financial tables don't exist, return empty array
        if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
          console.warn('Transaction categories table not found - working without categories');
          return [];
        }
        throw error;
      }

      return data?.map(row => this.mapCategoryRowToCategory(row)) || [];
    } catch (error) {
      // If financial tables don't exist, return empty array instead of throwing
      if (error && typeof error === 'object' && 'code' in error) {
        if (error.code === 'PGRST116' || (error as any).message?.includes('does not exist')) {
          console.warn('Transaction categories table not found - returning empty categories list');
          return [];
        }
      }
      console.warn('Error fetching categories by type (non-critical):', error);
      return [];
    }
  }

  /**
   * Generate a financial report for a given date range
   */
  async generateReport(dateRange: DateRange): Promise<FinancialReport> {
    try {
      const transactions = await this.getTransactions({
        date_from: dateRange.start_date,
        date_to: dateRange.end_date,
        sort_by: 'date',
        sort_order: 'desc'
      });

      const categories = await this.getCategories();

      // Calculate totals
      const totalIncome = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

      const totalExpenses = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

      const netProfit = totalIncome - totalExpenses;

      // Calculate category summaries
      const incomeByCategoryMap = new Map<string, CategorySummary>();
      const expensesByCategoryMap = new Map<string, CategorySummary>();

      transactions.forEach(transaction => {
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
          start_date: dateRange.start_date,
          end_date: dateRange.end_date
        },
        summary: {
          total_income: totalIncome,
          total_expenses: totalExpenses,
          net_profit: netProfit
        },
        income_by_category: Array.from(incomeByCategoryMap.values()),
        expenses_by_category: Array.from(expensesByCategoryMap.values()),
        transactions,
        generated_at: new Date()
      };
    } catch (error) {
      console.error('Error generating report:', error);
      throw error;
    }
  }

  /**
   * Check for duplicate transactions
   */
  async checkDuplicateTransaction(transaction: TransactionInput): Promise<Transaction[]> {
    try {
      const dateStr = transaction.date.toISOString().split('T')[0];
      
      // Look for transactions with same amount, category, and date within 24 hours
      const { data, error } = await supabase
        .from('financial_transactions')
        .select(`
          *,
          category:transaction_categories(*)
        `)
        .eq('amount', transaction.amount)
        .eq('category_id', transaction.category_id)
        .eq('date', dateStr);

      if (error) {
        throw error;
      }

      // Filter for similar descriptions (case-insensitive partial match)
      const duplicates = data?.filter(row => {
        const existingDesc = row.description.toLowerCase();
        const newDesc = transaction.description.toLowerCase();
        
        // Check if descriptions are similar (contain each other or are identical)
        return existingDesc.includes(newDesc) || newDesc.includes(existingDesc) || existingDesc === newDesc;
      }) || [];

      return duplicates.map(row => this.mapTransactionRowToTransaction(row));
    } catch (error) {
      console.error('Error checking for duplicate transactions:', error);
      throw error;
    }
  }

  /**
   * Get audit logs for a specific transaction
   */
  async getAuditLogs(recordId: string): Promise<AuditLog[]> {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('table_name', 'financial_transactions')
        .eq('record_id', recordId)
        .order('timestamp', { ascending: false });

      if (error) {
        throw error;
      }

      return data?.map(row => this.mapAuditLogRowToAuditLog(row)) || [];
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      throw error;
    }
  }

  /**
   * Map database row to Transaction object
   */
  private mapTransactionRowToTransaction(row: any): Transaction {
    return {
      id: row.id,
      type: row.type,
      amount: row.amount,
      date: new Date(row.date),
      category_id: row.category_id,
      category: this.mapCategoryRowToCategory(row.category),
      description: row.description,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
      created_by: row.created_by,
      updated_by: row.updated_by
    };
  }

  /**
   * Map database row to TransactionCategory object
   */
  private mapCategoryRowToCategory(row: TransactionCategoryRow): TransactionCategory {
    return {
      id: row.id,
      name: row.name,
      type: row.type,
      description: row.description,
      is_active: row.is_active,
      created_at: new Date(row.created_at)
    };
  }

  /**
   * Map database row to AuditLog object
   */
  private mapAuditLogRowToAuditLog(row: AuditLogRow): AuditLog {
    return {
      id: row.id,
      table_name: row.table_name,
      record_id: row.record_id,
      action: row.action,
      old_values: row.old_values,
      new_values: row.new_values,
      user_id: row.user_id,
      timestamp: new Date(row.timestamp)
    };
  }
}