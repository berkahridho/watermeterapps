-- Financial Tracking System Database Setup
-- Run these SQL commands in your Supabase SQL Editor after the main database setup

-- Create transaction_categories table
CREATE TABLE IF NOT EXISTS transaction_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense')),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(name, type)
);

-- Create financial_transactions table
CREATE TABLE IF NOT EXISTS financial_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense')),
    amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
    date DATE NOT NULL,
    category_id UUID NOT NULL REFERENCES transaction_categories(id),
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by TEXT NOT NULL,
    updated_by TEXT
);

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    table_name VARCHAR(50) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_values JSONB,
    new_values JSONB,
    user_id TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_financial_transactions_date ON financial_transactions(date);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_type ON financial_transactions(type);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_category ON financial_transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_created_at ON financial_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);

-- Enable Row Level Security (RLS) - Simple approach
ALTER TABLE transaction_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create simple policies that allow all operations for authenticated users
-- Transaction Categories Policies
DROP POLICY IF EXISTS "transaction_categories_policy" ON transaction_categories;
CREATE POLICY "transaction_categories_policy" ON transaction_categories
    FOR ALL USING (true);

-- Financial Transactions Policies  
DROP POLICY IF EXISTS "financial_transactions_policy" ON financial_transactions;
CREATE POLICY "financial_transactions_policy" ON financial_transactions
    FOR ALL USING (true);

-- Audit Logs Policies
DROP POLICY IF EXISTS "audit_logs_policy" ON audit_logs;
CREATE POLICY "audit_logs_policy" ON audit_logs
    FOR ALL USING (true);

-- Insert default transaction categories
INSERT INTO transaction_categories (name, type, description) VALUES
    -- Income categories
    ('Pemasukan RT 1', 'income', 'Income from RT 1 water billing payments', true),
    ('Pemasukan RT 2', 'income', 'Income from RT 2 water billing payments', true),
    ('Pemasukan RT 3', 'income', 'Income from RT 3 water billing payments', true),
    ('Pemasukan RT 4', 'income', 'Income from RT 4 water billing payments', true),
    ('Pemasukan RT 5', 'income', 'Income from RT 5 water billing payments', true),
    
    -- Additional income categories
    ('Saldo Awal', 'income', 'Initial balance from previous year', true),
    ('Lainnya', 'income', 'Other miscellaneous income sources', true)
    
    -- Expense categories
    ('Pulsa Listrik Cangkring', 'expense', 'Electricity credit for Cangkring area'),
    ('Pulsa Listrik Sendang', 'expense', 'Electricity credit for Sendang area'),
    ('Perawatan/Service', 'expense', 'Equipment maintenance and service costs'),
    ('Sparepart', 'expense', 'Replacement parts and components'),
    ('Transportasi', 'expense', 'Transportation and travel expenses'),
    ('Konsumsi/Sosial', 'expense', 'Food, drinks, and social activities'),
    ('Insentif', 'expense', 'Incentives and bonuses for staff'),
    ('Operasional', 'expense', 'General operational expenses'),
    ('Pengembangan Desa', 'expense', 'Village development projects and initiatives')
ON CONFLICT (name, type) DO NOTHING;

-- Create function to automatically create audit logs
CREATE OR REPLACE FUNCTION create_audit_log()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO audit_logs (table_name, record_id, action, old_values, user_id)
        VALUES (TG_TABLE_NAME, OLD.id, TG_OP, row_to_json(OLD), COALESCE(auth.email(), 'system'));
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_logs (table_name, record_id, action, old_values, new_values, user_id)
        VALUES (TG_TABLE_NAME, NEW.id, TG_OP, row_to_json(OLD), row_to_json(NEW), COALESCE(auth.email(), 'system'));
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO audit_logs (table_name, record_id, action, new_values, user_id)
        VALUES (TG_TABLE_NAME, NEW.id, TG_OP, row_to_json(NEW), COALESCE(auth.email(), 'system'));
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for audit logging on financial_transactions
DROP TRIGGER IF EXISTS financial_transactions_audit_trigger ON financial_transactions;
CREATE TRIGGER financial_transactions_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON financial_transactions
    FOR EACH ROW EXECUTE FUNCTION create_audit_log();

-- Create triggers for audit logging on transaction_categories
DROP TRIGGER IF EXISTS transaction_categories_audit_trigger ON transaction_categories;
CREATE TRIGGER transaction_categories_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON transaction_categories
    FOR EACH ROW EXECUTE FUNCTION create_audit_log();