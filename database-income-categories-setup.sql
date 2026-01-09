-- Income Categories Setup for Water Meter System
-- Run this SQL script in your Supabase SQL Editor

-- First, fix the existing Water Billing category (it has empty name)
UPDATE transaction_categories 
SET name = 'Water Billing' 
WHERE name = '' AND type = 'income';

-- Insert new RT-specific income categories
INSERT INTO transaction_categories (name, type, description, is_active) VALUES
    -- RT-specific income categories
    ('Pemasukan RT 1', 'income', 'Income from RT 1 water billing payments', true),
    ('Pemasukan RT 2', 'income', 'Income from RT 2 water billing payments', true),
    ('Pemasukan RT 3', 'income', 'Income from RT 3 water billing payments', true),
    ('Pemasukan RT 4', 'income', 'Income from RT 4 water billing payments', true),
    ('Pemasukan RT 5', 'income', 'Income from RT 5 water billing payments', true),
    
    -- Additional income categories
    ('Saldo Awal', 'income', 'Initial balance from previous year', true),
    ('Lainnya', 'income', 'Other miscellaneous income sources', true)
ON CONFLICT (name, type) DO UPDATE SET
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active;

-- Update existing categories to ensure they're active
UPDATE transaction_categories 
SET is_active = true 
WHERE type = 'income' AND name IN (
    'Pemasukan RT 1',
    'Pemasukan RT 2', 
    'Pemasukan RT 3',
    'Pemasukan RT 4',
    'Pemasukan RT 5',
    'Saldo Awal',
    'Lainnya'
);

-- Verify the categories were created
SELECT name, type, description, is_active 
FROM transaction_categories 
WHERE type = 'income' 
ORDER BY 
    CASE 
        WHEN name LIKE 'Pemasukan RT%' THEN 1
        WHEN name = 'Saldo Awal' THEN 2
        WHEN name = 'Lainnya' THEN 3
        ELSE 4
    END,
    name;