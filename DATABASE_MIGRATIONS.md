# Database Migrations for Financial Tracking System

This document explains how to use the database migration files to seed default transaction categories.

## Migration Files

### 1. `database-seed-income-categories.sql`
Seeds default income categories for water meter management:
- Water Billing
- Late Fees  
- Connection Fees
- Reconnection Fees
- Other Revenue

### 2. `database-seed-expense-categories.sql`
Seeds default expense categories for water meter management:
- Maintenance
- Equipment
- Utilities
- Administrative
- Labor
- Transportation
- Other Expenses

### 3. `database-seed-default-categories.sql`
Combined migration that seeds both income and expense categories in a single transaction.

## How to Run Migrations

### Prerequisites
- Supabase project set up
- Main database schema created (run `database-financial-setup.sql` first)
- Access to Supabase SQL Editor or psql command line

### Option 1: Using Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of the desired migration file
4. Click "Run" to execute the migration

### Option 2: Using psql Command Line
```bash
# Run individual migrations
psql -h your-db-host -U your-username -d your-database -f database-seed-income-categories.sql
psql -h your-db-host -U your-username -d your-database -f database-seed-expense-categories.sql

# Or run the combined migration
psql -h your-db-host -U your-username -d your-database -f database-seed-default-categories.sql
```

### Option 3: Using Supabase CLI
```bash
# If using Supabase CLI with local development
supabase db reset
# Then run your migration files through the dashboard
```

## Verification

After running the migrations, you can verify the categories were created by running:

```sql
SELECT 
    type,
    COUNT(*) as category_count,
    STRING_AGG(name, ', ' ORDER BY name) as categories
FROM transaction_categories 
GROUP BY type 
ORDER BY type;
```

Expected output:
- **expense**: 7 categories (Administrative, Equipment, Labor, Maintenance, Other Expenses, Transportation, Utilities)
- **income**: 5 categories (Connection Fees, Late Fees, Other Revenue, Reconnection Fees, Water Billing)

## Notes

- All migrations use `ON CONFLICT (name, type) DO NOTHING` to prevent duplicate entries
- Categories are created with `is_active = true` by default
- The combined migration uses a transaction to ensure atomicity
- All migrations include verification queries to confirm successful execution

## Requirements Satisfied

These migrations satisfy the following requirements from the financial tracking specification:
- **Requirement 1.5**: Default income categories for water management operations
- **Requirement 2.5**: Default expense categories for operational costs