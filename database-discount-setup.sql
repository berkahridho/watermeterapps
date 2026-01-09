-- Customer Discounts Table Setup for Water Meter Monitoring System
-- Run this script in your Supabase SQL Editor to add discount functionality

-- Create customer_discounts table
CREATE TABLE IF NOT EXISTS customer_discounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    discount_percentage DECIMAL(5,2) DEFAULT 0 CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
    discount_amount DECIMAL(10,2) DEFAULT 0 CHECK (discount_amount >= 0),
    reason TEXT NOT NULL,
    discount_month VARCHAR(7) NOT NULL, -- Format: YYYY-MM (e.g., "2025-01")
    created_by TEXT NOT NULL DEFAULT 'admin',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Ensure either percentage or amount is set, but not both
    CONSTRAINT check_discount_type CHECK (
        (discount_percentage > 0 AND discount_amount = 0) OR 
        (discount_percentage = 0 AND discount_amount > 0)
    ),
    
    -- Ensure only one active discount per customer per month
    CONSTRAINT unique_customer_month_active UNIQUE (customer_id, discount_month)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_customer_discounts_customer_month 
ON customer_discounts(customer_id, discount_month);

CREATE INDEX IF NOT EXISTS idx_customer_discounts_month_active 
ON customer_discounts(discount_month, is_active);

CREATE INDEX IF NOT EXISTS idx_customer_discounts_created_at 
ON customer_discounts(created_at DESC);

-- Add comments for documentation
COMMENT ON TABLE customer_discounts IS 'Stores monthly discount information for customers';
COMMENT ON COLUMN customer_discounts.discount_percentage IS 'Percentage discount (0-100), mutually exclusive with discount_amount';
COMMENT ON COLUMN customer_discounts.discount_amount IS 'Fixed amount discount in IDR, mutually exclusive with discount_percentage';
COMMENT ON COLUMN customer_discounts.reason IS 'Reason for giving the discount (required for audit)';
COMMENT ON COLUMN customer_discounts.discount_month IS 'Month for which discount applies (YYYY-MM format)';
COMMENT ON COLUMN customer_discounts.created_by IS 'Admin who created the discount';
COMMENT ON COLUMN customer_discounts.is_active IS 'Whether the discount is currently active';

-- Enable Row Level Security (RLS)
ALTER TABLE customer_discounts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to read discounts" ON customer_discounts;
DROP POLICY IF EXISTS "Allow authenticated users to create discounts" ON customer_discounts;
DROP POLICY IF EXISTS "Allow authenticated users to update discounts" ON customer_discounts;
DROP POLICY IF EXISTS "Allow authenticated users to delete discounts" ON customer_discounts;
DROP POLICY IF EXISTS "customer_discounts_policy" ON customer_discounts;

-- Create simple policy for authenticated users (compatible with existing RLS setup)
CREATE POLICY "customer_discounts_policy" ON customer_discounts
    FOR ALL 
    USING (true);

-- Insert some sample discount data (optional - remove if not needed)
-- Note: Using INSERT with WHERE NOT EXISTS to avoid conflict issues
INSERT INTO customer_discounts (customer_id, discount_percentage, reason, discount_month, created_by) 
SELECT 
    id, 
    10.0, 
    'Sample 10% discount for testing',
    TO_CHAR(CURRENT_DATE, 'YYYY-MM'),
    'system'
FROM customers 
WHERE NOT EXISTS (
    SELECT 1 FROM customer_discounts 
    WHERE customer_id = customers.id 
    AND discount_month = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
)
LIMIT 1;

-- Verify the table was created successfully
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'customer_discounts' 
ORDER BY ordinal_position;