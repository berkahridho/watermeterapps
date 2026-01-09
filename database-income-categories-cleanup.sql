-- Income Categories Cleanup Script
-- Run this SQL script in your Supabase SQL Editor to remove duplicate RT categories

-- Remove duplicate RT categories (keep only the cleaner "Pemasukan RT X" format)
-- Delete the old numbered format categories that are causing confusion
DELETE FROM transaction_categories 
WHERE type = 'income' 
AND name IN (
    'Pemasukan 001', 
    'Pemasukan 002', 
    'Pemasukan 003', 
    'Pemasukan 004', 
    'Pemasukan 005',
    'Income from 001',
    'Income from 002', 
    'Income from 003',
    'Income from 004',
    'Income from 005',
    'Income from RT 1',
    'Income from RT 2',
    'Income from RT 3', 
    'Income from RT 4',
    'Income from RT 5'
);

-- Clean up any other auto-generated RT categories that might conflict
DELETE FROM transaction_categories 
WHERE type = 'income' 
AND (
    name LIKE 'Income from RT%' OR 
    name LIKE 'Income from 0%' OR
    name LIKE 'Pemasukan 0%'
);

-- Ensure the correct RT categories exist and are active
INSERT INTO transaction_categories (name, type, description, is_active) VALUES
    ('Pemasukan RT 1', 'income', 'Income from RT 1 water billing payments', true),
    ('Pemasukan RT 2', 'income', 'Income from RT 2 water billing payments', true),
    ('Pemasukan RT 3', 'income', 'Income from RT 3 water billing payments', true),
    ('Pemasukan RT 4', 'income', 'Income from RT 4 water billing payments', true),
    ('Pemasukan RT 5', 'income', 'Income from RT 5 water billing payments', true),
    ('Saldo Awal', 'income', 'Initial balance from previous year', true),
    ('Lainnya', 'income', 'Other miscellaneous income sources', true)
ON CONFLICT (name, type) DO UPDATE SET
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active;

-- Verify the final clean categories (should only show the correct ones)
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

-- Show count to verify cleanup
SELECT 
    'Total income categories after cleanup' as info,
    COUNT(*) as count
FROM transaction_categories 
WHERE type = 'income' AND is_active = true;