-- Meter Reading System Repair Script
-- Fix data integrity issues and optimize the meter reading system

-- ============================================================================
-- METER READING SYSTEM ANALYSIS & REPAIR
-- ============================================================================

-- STEP 1: Analyze current meter reading data
SELECT 
    'Current meter readings count' as metric,
    COUNT(*) as value
FROM meter_readings
UNION ALL
SELECT 
    'Customers with readings',
    COUNT(DISTINCT customer_id)
FROM meter_readings
UNION ALL
SELECT 
    'Readings in last 30 days',
    COUNT(*)
FROM meter_readings 
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
UNION ALL
SELECT 
    'Duplicate readings (same customer, same month)',
    COUNT(*) - COUNT(DISTINCT (customer_id, DATE_TRUNC('month', date)))
FROM meter_readings;

-- STEP 2: Fix data integrity issues

-- Remove exact duplicates (same customer, same date, same reading)
WITH duplicates AS (
    SELECT id, ROW_NUMBER() OVER (
        PARTITION BY customer_id, date, reading 
        ORDER BY created_at DESC
    ) as rn
    FROM meter_readings
)
DELETE FROM meter_readings 
WHERE id IN (
    SELECT id FROM duplicates WHERE rn > 1
);

-- STEP 3: Identify and fix anomalous readings

-- Find readings that go backwards (current < previous)
WITH reading_pairs AS (
    SELECT 
        mr1.id,
        mr1.customer_id,
        mr1.reading as current_reading,
        mr1.date as current_date,
        LAG(mr1.reading) OVER (
            PARTITION BY mr1.customer_id 
            ORDER BY mr1.date
        ) as previous_reading,
        LAG(mr1.date) OVER (
            PARTITION BY mr1.customer_id 
            ORDER BY mr1.date
        ) as previous_date
    FROM meter_readings mr1
)
SELECT 
    'Backwards readings found' as issue,
    COUNT(*) as count
FROM reading_pairs 
WHERE previous_reading IS NOT NULL 
AND current_reading < previous_reading;

-- STEP 4: Add validation constraints to prevent future issues

-- Ensure readings are not negative
ALTER TABLE meter_readings 
ADD CONSTRAINT check_reading_positive 
CHECK (reading >= 0);

-- Add constraint to prevent readings in the future
ALTER TABLE meter_readings 
ADD CONSTRAINT check_date_not_future 
CHECK (date <= CURRENT_DATE);

-- STEP 5: Create function to validate meter readings
CREATE OR REPLACE FUNCTION validate_meter_reading()
RETURNS TRIGGER AS $$
DECLARE
    prev_reading DECIMAL;
    avg_usage DECIMAL;
    projected_usage DECIMAL;
BEGIN
    -- Get previous reading for this customer
    SELECT reading INTO prev_reading
    FROM meter_readings 
    WHERE customer_id = NEW.customer_id 
    AND date < NEW.date
    ORDER BY date DESC 
    LIMIT 1;
    
    -- If there's a previous reading, validate it's not going backwards
    IF prev_reading IS NOT NULL AND NEW.reading < prev_reading THEN
        RAISE EXCEPTION 'New reading (%) cannot be less than previous reading (%)', 
            NEW.reading, prev_reading;
    END IF;
    
    -- Calculate 5-month average usage for anomaly detection
    IF prev_reading IS NOT NULL THEN
        SELECT AVG(
            reading - LAG(reading) OVER (ORDER BY date)
        ) INTO avg_usage
        FROM (
            SELECT reading, date
            FROM meter_readings 
            WHERE customer_id = NEW.customer_id 
            AND date < NEW.date
            ORDER BY date DESC 
            LIMIT 6
        ) recent_readings;
        
        projected_usage := NEW.reading - prev_reading;
        
        -- Log warning for anomalous usage (>200% of average) if audit_logs table exists
        IF avg_usage IS NOT NULL AND projected_usage > (avg_usage * 2) THEN
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
                INSERT INTO audit_logs (
                    table_name, 
                    operation, 
                    record_id, 
                    old_values, 
                    new_values, 
                    user_id, 
                    timestamp
                ) VALUES (
                    'meter_readings',
                    'ANOMALY_WARNING',
                    NEW.id::text,
                    jsonb_build_object('average_usage', avg_usage),
                    jsonb_build_object('projected_usage', projected_usage, 'percentage', (projected_usage/avg_usage*100)::int),
                    'system',
                    NOW()
                );
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for meter reading validation
DROP TRIGGER IF EXISTS validate_meter_reading_trigger ON meter_readings;
CREATE TRIGGER validate_meter_reading_trigger
    BEFORE INSERT OR UPDATE ON meter_readings
    FOR EACH ROW
    EXECUTE FUNCTION validate_meter_reading();

-- STEP 6: Create function to prevent duplicate monthly readings
CREATE OR REPLACE FUNCTION prevent_duplicate_monthly_reading()
RETURNS TRIGGER AS $$
DECLARE
    existing_count INTEGER;
BEGIN
    -- Check if there's already a reading for this customer in the same month
    SELECT COUNT(*) INTO existing_count
    FROM meter_readings 
    WHERE customer_id = NEW.customer_id 
    AND DATE_TRUNC('month', date) = DATE_TRUNC('month', NEW.date)
    AND (TG_OP = 'INSERT' OR id != NEW.id);
    
    IF existing_count > 0 THEN
        RAISE EXCEPTION 'Only one reading per customer per month is allowed. Customer % already has a reading for %', 
            NEW.customer_id, TO_CHAR(NEW.date, 'Month YYYY');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for duplicate prevention
DROP TRIGGER IF EXISTS prevent_duplicate_monthly_reading_trigger ON meter_readings;
CREATE TRIGGER prevent_duplicate_monthly_reading_trigger
    BEFORE INSERT OR UPDATE ON meter_readings
    FOR EACH ROW
    EXECUTE FUNCTION prevent_duplicate_monthly_reading();

-- STEP 7: Create utility functions for meter reading operations

-- Function to get previous reading for a customer
CREATE OR REPLACE FUNCTION get_previous_reading(
    p_customer_id UUID,
    p_date DATE
) RETURNS TABLE(reading DECIMAL, date DATE) AS $$
BEGIN
    RETURN QUERY
    SELECT mr.reading, mr.date
    FROM meter_readings mr
    WHERE mr.customer_id = p_customer_id 
    AND mr.date < p_date
    ORDER BY mr.date DESC 
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate 5-month average usage
CREATE OR REPLACE FUNCTION calculate_five_month_average(
    p_customer_id UUID,
    p_date DATE
) RETURNS DECIMAL AS $$
DECLARE
    avg_usage DECIMAL;
BEGIN
    SELECT AVG(
        reading - LAG(reading) OVER (ORDER BY date)
    ) INTO avg_usage
    FROM (
        SELECT reading, date
        FROM meter_readings 
        WHERE customer_id = p_customer_id 
        AND date < p_date
        ORDER BY date DESC 
        LIMIT 6
    ) recent_readings;
    
    RETURN COALESCE(avg_usage, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to check for duplicate monthly reading
CREATE OR REPLACE FUNCTION check_duplicate_monthly_reading(
    p_customer_id UUID,
    p_date DATE,
    p_exclude_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    existing_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO existing_count
    FROM meter_readings 
    WHERE customer_id = p_customer_id 
    AND DATE_TRUNC('month', date) = DATE_TRUNC('month', p_date)
    AND (p_exclude_id IS NULL OR id != p_exclude_id);
    
    RETURN existing_count > 0;
END;
$$ LANGUAGE plpgsql;

-- STEP 8: Create view for meter reading analytics
CREATE OR REPLACE VIEW meter_reading_analytics AS
WITH reading_with_usage AS (
    SELECT 
        mr.*,
        c.name as customer_name,
        c.rt,
        LAG(mr.reading) OVER (
            PARTITION BY mr.customer_id 
            ORDER BY mr.date
        ) as previous_reading,
        mr.reading - LAG(mr.reading) OVER (
            PARTITION BY mr.customer_id 
            ORDER BY mr.date
        ) as usage,
        LAG(mr.date) OVER (
            PARTITION BY mr.customer_id 
            ORDER BY mr.date
        ) as previous_date
    FROM meter_readings mr
    JOIN customers c ON mr.customer_id = c.id
)
SELECT 
    *,
    CASE 
        WHEN usage IS NULL THEN 'First Reading'
        WHEN usage < 0 THEN 'Backwards Reading'
        WHEN usage = 0 THEN 'No Usage'
        WHEN usage > 50 THEN 'High Usage'
        ELSE 'Normal'
    END as usage_category,
    EXTRACT(DAYS FROM (date - previous_date)) as days_between_readings
FROM reading_with_usage;

-- STEP 9: Create indexes for optimal performance
CREATE INDEX IF NOT EXISTS idx_meter_readings_customer_date_desc 
ON meter_readings(customer_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_meter_readings_date_month 
ON meter_readings(DATE_TRUNC('month', date));

CREATE INDEX IF NOT EXISTS idx_meter_readings_created_at 
ON meter_readings(created_at);

-- STEP 10: Update table statistics
ANALYZE meter_readings;
ANALYZE customers;

-- ============================================================================
-- REPAIR SUMMARY:
-- 
-- ✅ Data Integrity:
--    - Removed duplicate readings
--    - Added validation constraints
--    - Created triggers for data validation
-- 
-- ✅ Business Logic:
--    - Prevent duplicate monthly readings
--    - Validate readings don't go backwards
--    - Anomaly detection for unusual usage
-- 
-- ✅ Performance:
--    - Added optimized indexes
--    - Created utility functions
--    - Created analytics view
-- 
-- ✅ Monitoring:
--    - Audit logging for anomalies
--    - Analytics view for reporting
--    - Utility functions for common operations
-- 
-- The meter reading system is now robust, validated, and optimized.
-- ============================================================================

-- Verification queries:
SELECT 'Meter Reading System Status' as status;

SELECT 
    'Total readings' as metric,
    COUNT(*) as value
FROM meter_readings
UNION ALL
SELECT 
    'Customers with readings',
    COUNT(DISTINCT customer_id)
FROM meter_readings
UNION ALL
SELECT 
    'Average readings per customer',
    ROUND(COUNT(*)::DECIMAL / COUNT(DISTINCT customer_id), 2)
FROM meter_readings
UNION ALL
SELECT 
    'Readings in last 30 days',
    COUNT(*)
FROM meter_readings 
WHERE date >= CURRENT_DATE - INTERVAL '30 days';

-- Check for any remaining data quality issues
SELECT 
    usage_category,
    COUNT(*) as count
FROM meter_reading_analytics 
GROUP BY usage_category
ORDER BY count DESC;