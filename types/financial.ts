// Financial Tracking System Type Definitions

export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  date: Date;
  category_id: string;
  category: TransactionCategory;
  description: string;
  created_at: Date;
  updated_at: Date;
  created_by: string;
  updated_by?: string;
}

export interface TransactionInput {
  type: 'income' | 'expense';
  amount: number;
  date: Date;
  category_id: string;
  description: string;
}

export interface TransactionCategory {
  id: string;
  name: string;
  type: 'income' | 'expense';
  description?: string;
  is_active: boolean;
  created_at: Date;
}

export interface TransactionFilters {
  type?: 'income' | 'expense' | 'all';
  category_ids?: string[];
  date_from?: Date;
  date_to?: Date;
  search_term?: string;
  sort_by?: 'date' | 'amount' | 'category';
  sort_order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface FinancialReport {
  period: {
    start_date: Date;
    end_date: Date;
  };
  summary: {
    total_income: number;
    total_expenses: number;
    net_profit: number;
  };
  income_by_category: CategorySummary[];
  expenses_by_category: CategorySummary[];
  transactions: Transaction[];
  generated_at: Date;
}

export interface CategorySummary {
  category: TransactionCategory;
  total_amount: number;
  transaction_count: number;
  percentage_of_total: number;
}

export interface AuditLog {
  id: string;
  table_name: string;
  record_id: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  user_id: string;
  timestamp: Date;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface DateRange {
  start_date: Date;
  end_date: Date;
}

// Database row types (for Supabase queries)
export interface TransactionRow {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  date: string; // ISO date string from database
  category_id: string;
  description: string;
  created_at: string; // ISO timestamp string from database
  updated_at: string; // ISO timestamp string from database
  created_by: string;
  updated_by?: string;
}

export interface TransactionCategoryRow {
  id: string;
  name: string;
  type: 'income' | 'expense';
  description?: string;
  is_active: boolean;
  created_at: string; // ISO timestamp string from database
}

export interface AuditLogRow {
  id: string;
  table_name: string;
  record_id: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  user_id: string;
  timestamp: string; // ISO timestamp string from database
}