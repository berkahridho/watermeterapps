-- Water Meter Monitoring System Database Setup
-- Run these SQL commands in your Supabase SQL Editor

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    rt VARCHAR(10),
    phone VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create meter_readings table
CREATE TABLE IF NOT EXISTS meter_readings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    reading INTEGER NOT NULL,
    date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_rt ON customers(rt);
CREATE INDEX IF NOT EXISTS idx_meter_readings_customer_id ON meter_readings(customer_id);
CREATE INDEX IF NOT EXISTS idx_meter_readings_date ON meter_readings(date);
CREATE INDEX IF NOT EXISTS idx_meter_readings_customer_date ON meter_readings(customer_id, date);

-- Enable Row Level Security (RLS)
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE meter_readings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON customers;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON customers;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON customers;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON customers;

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON meter_readings;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON meter_readings;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON meter_readings;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON meter_readings;

-- Create simple policies for authenticated users (customers table)
CREATE POLICY "customers_policy" ON customers
    FOR ALL USING (auth.uid() IS NOT NULL);

-- Create simple policies for authenticated users (meter_readings table)
CREATE POLICY "meter_readings_policy" ON meter_readings
    FOR ALL USING (auth.uid() IS NOT NULL);

-- Insert sample data (optional)
INSERT INTO customers (name, rt, phone) VALUES
    ('John Doe', '001', '081234567890'),
    ('Jane Smith', '001', '081234567891'),
    ('Bob Johnson', '002', '081234567892'),
    ('Alice Brown', '002', '081234567893'),
    ('Charlie Wilson', '003', '081234567894')
ON CONFLICT DO NOTHING;

-- Insert sample meter readings (optional)
INSERT INTO meter_readings (customer_id, reading, date)
SELECT 
    c.id,
    FLOOR(RANDOM() * 1000 + 100)::INTEGER,
    NOW() - INTERVAL '1 month'
FROM customers c
ON CONFLICT DO NOTHING;