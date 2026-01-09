-- Meter Adjustments Table Setup for Gauge Replacement
-- Run this script in your Supabase SQL Editor

-- Create meter_adjustments table to track gauge replacements and adjustments
CREATE TABLE IF NOT EXISTS meter_adjustments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    old_reading DECIMAL(10,2) NOT NULL, -- Last reading before replacement
    new_reading DECIMAL(10,2) NOT NULL, -- New reading after replacement/adjustment
    adjustment_type VARCHAR(50) NOT NULL CHECK (adjustment_type IN ('gauge_replacement', 'manual_correction', 'meter_reset')),
    reason TEXT NOT NULL, -- Reason for adjustment (e.g., "Gauge replaced due to damage")
    adjustment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_by TEXT NOT NULL, -- Admin who made the adjustment
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT, -- Additional notes about the adjustment
    
    -- Ensure adjustment date is valid
    CONSTRAINT valid_adjustment_date CHECK (adjustment_date <= CURRENT_DATE)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_meter_adjustments_customer_id 
ON meter_adjustments(customer_id);

CREATE INDEX IF NOT EXISTS idx_meter_adjustments_date 
ON meter_adjustments(adjustment_date DESC);

CREATE INDEX IF NOT EXISTS idx_meter_adjustments_type 
ON meter_adjustments(adjustment_type);

-- Add comments for documentation
COMMENT ON TABLE meter_adjustments IS 'Tracks meter gauge replacements and manual adjustments';
COMMENT ON COLUMN meter_adjustments.old_reading IS 'Last meter reading before adjustment';
COMMENT ON COLUMN meter_adjustments.new_reading IS 'New meter reading after adjustment';
COMMENT ON COLUMN meter_adjustments.adjustment_type IS 'Type of adjustment: gauge_replacement, manual_correction, meter_reset';
COMMENT ON COLUMN meter_adjustments.reason IS 'Reason for the meter adjustment';
COMMENT ON COLUMN meter_adjustments.created_by IS 'Admin user who performed the adjustment';
COMMENT ON COLUMN meter_adjustments.notes IS 'Additional notes about the adjustment';

-- Enable Row Level Security (RLS)
ALTER TABLE meter_adjustments ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users (compatible with existing RLS setup)
DROP POLICY IF EXISTS "meter_adjustments_policy" ON meter_adjustments;
CREATE POLICY "meter_adjustments_policy" ON meter_adjustments
    FOR ALL 
    USING (true);

-- Create a function to get the latest reading for a customer (considering adjustments)
CREATE OR REPLACE FUNCTION get_customer_latest_reading(customer_uuid UUID)
RETURNS TABLE (
    reading DECIMAL(10,2),
    date DATE,
    source TEXT,
    is_adjusted BOOLEAN
) AS $$
BEGIN
    -- First check if there are any adjustments
    IF EXISTS (SELECT 1 FROM meter_adjustments WHERE customer_id = customer_uuid) THEN
        -- Get the most recent adjustment
        RETURN QUERY
        SELECT 
            ma.new_reading as reading,
            ma.adjustment_date as date,
            'adjustment' as source,
            true as is_adjusted
        FROM meter_adjustments ma
        WHERE ma.customer_id = customer_uuid
        ORDER BY ma.adjustment_date DESC, ma.created_at DESC
        LIMIT 1;
    ELSE
        -- Get the most recent meter reading
        RETURN QUERY
        SELECT 
            mr.reading::DECIMAL(10,2) as reading,
            mr.date::DATE as date,
            'reading' as source,
            false as is_adjusted
        FROM meter_readings mr
        WHERE mr.customer_id = customer_uuid
        ORDER BY mr.date DESC, mr.created_at DESC
        LIMIT 1;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Add comment for the function
COMMENT ON FUNCTION get_customer_latest_reading(UUID) IS 'Gets the latest meter reading for a customer, considering adjustments';


-- Verify the table was created successfully
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'meter_adjustments' 
ORDER BY ordinal_position;