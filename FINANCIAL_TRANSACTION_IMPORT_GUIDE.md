# Financial Transaction Import Guide

## 🎯 **Best Practices for Importing Financial Data**

### **1. Data Preparation Strategy**

#### **Excel File Structure (Recommended)**
```
financial_transactions.xlsx:
- type (required - "income" or "expense")
- amount (required - positive number without currency symbol)
- date (required - format: YYYY-MM-DD or DD/MM/YYYY)
- category_name (required - must match existing category in database)
- description (optional - transaction description)
- created_by (optional - defaults to "system")
```

### **2. Import Methods (Choose One)**

#### **Method A: CSV Import via Web Interface (Recommended)**
1. **Export Excel to CSV** (UTF-8 encoding)
2. **Use the web import interface** at `/admin/import`
3. **Download template** first to see correct format
4. **Validate categories** using "Show Available Categories" button
5. **Import with confirmation** - preview matches before importing

#### **Method B: SQL Import (For Large Data)**
```sql
-- Step 1: Create temporary table
CREATE TEMP TABLE temp_transactions (
    type TEXT,
    amount DECIMAL,
    date DATE,
    category_name TEXT,
    description TEXT,
    created_by TEXT
);

-- Step 2: Import CSV data (export Excel to CSV first)
-- Use Supabase dashboard: Table Editor → Import via CSV

-- Step 3: Insert transactions with category matching
INSERT INTO financial_transactions (type, amount, date, category_id, description, created_by)
SELECT 
    tt.type,
    tt.amount,
    tt.date,
    tc.id,
    COALESCE(tt.description, tt.type || ' transaction'),
    COALESCE(tt.created_by, 'system')
FROM temp_transactions tt
JOIN transaction_categories tc ON tc.name = tt.category_name AND tc.type = tt.type
WHERE tc.is_active = true;
```

### **3. Data Validation Checklist**

#### **Before Import:**
- [ ] **Transaction Type**: Only "income" or "expense" (lowercase)
- [ ] **Amount Format**: Positive numbers without currency symbols (e.g., 150000, not Rp 150.000)
- [ ] **Date Format**: Consistent YYYY-MM-DD or DD/MM/YYYY format
- [ ] **Category Names**: Exact match with existing categories in database
- [ ] **Category Types**: Income categories for income transactions, expense categories for expense transactions
- [ ] **No Duplicates**: Same transaction details should not be repeated
- [ ] **Valid Amounts**: All amounts should be positive numbers

#### **After Import:**
- [ ] **Transaction Count**: Verify total transactions imported
- [ ] **Amount Totals**: Check total income and expense amounts
- [ ] **Date Range**: Verify earliest and latest transaction dates
- [ ] **Category Distribution**: Check transactions per category
- [ ] **Missing Data**: Identify any failed imports

### **4. Sample Import Data**

#### **Transaction Import CSV:**
```csv
type,amount,date,category_name,description,created_by
income,150000,2024-12-15,Pemasukan RT 1,Payment from RT 01 - December 2024,admin
expense,50000,2024-12-14,Pulsa Listrik Cangkring,Electricity bill for pump station,admin
income,200000,2025-01-13,Pemasukan RT 2,Payment from RT 02 - December 2024,admin
expense,75000,2024-12-12,Perawatan/Service,Monthly pump maintenance,admin
income,25000,2024-12-11,Late Fees,Late payment penalty - RT 03,admin
expense,100000,2024-12-10,Sparepart,Water pump replacement parts,admin
income,500000,2024-12-09,Saldo Awal,Initial balance from previous year,admin
income,75000,2025-01-08,Lainnya,Late payment RT 03 - December 2024,admin
```

### **5. Available Transaction Categories**

#### **Income Categories:**
- **RT-Specific Income:**
  - Pemasukan RT 1 (Income from RT 1)
  - Pemasukan RT 2 (Income from RT 2) 
  - Pemasukan RT 3 (Income from RT 3)
  - Pemasukan RT 4 (Income from RT 4)
  - Pemasukan RT 5 (Income from RT 5)
- **General Income:**
  - Water Billing (General water billing payments)
  - Late Fees (Late payment penalties)
  - Connection Fees (New customer connections)
  - Other Revenue (Miscellaneous income)
  - Saldo Awal (Initial balance from previous year)
  - Lainnya (Other miscellaneous income sources)

#### **Expense Categories:**
- Pulsa Listrik Cangkring
- Pulsa Listrik Sendang
- Perawatan/Service
- Sparepart
- Transportasi
- Konsumsi/Sosial
- Insentif
- Operasional
- Pengembangan Desa

### **6. Troubleshooting Common Issues**

#### **Category Not Found Errors:**
```sql
-- Check available categories
SELECT name, type, is_active 
FROM transaction_categories 
WHERE is_active = true 
ORDER BY type, name;

-- Add missing category if needed
INSERT INTO transaction_categories (name, type, description, is_active)
VALUES ('New Category Name', 'income', 'Description of the category', true);
```

#### **Date Format Issues:**
- **Accepted formats**: YYYY-MM-DD, DD/MM/YYYY
- **Invalid formats**: MM/DD/YYYY, DD-MM-YYYY, text dates
- **Solution**: Convert all dates to YYYY-MM-DD format before import

#### **Amount Format Issues:**
- **Correct**: 150000, 50000.50, 25000
- **Incorrect**: Rp 150.000, $50, 25,000, -50000
- **Solution**: Remove currency symbols, use decimal point (not comma), ensure positive numbers

### **7. Post-Import Validation**

#### **Verification Queries:**
```sql
-- Check import results by type
SELECT 
    type,
    COUNT(*) as transaction_count,
    SUM(amount) as total_amount,
    MIN(date) as earliest_date,
    MAX(date) as latest_date
FROM financial_transactions 
GROUP BY type 
ORDER BY type;

-- Check transactions by category
SELECT 
    tc.name as category_name,
    tc.type,
    COUNT(ft.*) as transaction_count,
    SUM(ft.amount) as total_amount
FROM transaction_categories tc
LEFT JOIN financial_transactions ft ON tc.id = ft.category_id
WHERE tc.is_active = true
GROUP BY tc.name, tc.type
ORDER BY tc.type, tc.name;

-- Find transactions without valid categories
SELECT * FROM financial_transactions 
WHERE category_id NOT IN (SELECT id FROM transaction_categories WHERE is_active = true);
```

### **8. Recommended Import Workflow**

1. **Prepare Categories**: Ensure all needed categories exist in the system
2. **Download Template**: Use the web interface to get the correct format
3. **Prepare Data**: Clean and format your Excel data according to template
4. **Export to CSV**: Save as CSV with UTF-8 encoding
5. **Validate Categories**: Use "Show Available Categories" to verify category names
6. **Import with Preview**: Use the web interface to preview matches before importing
7. **Verify Results**: Check the import results and run validation queries
8. **Test Reports**: Generate financial reports to verify data integrity

### **9. Excel Template**

Create standardized Excel template:

#### **financial_transactions_template.xlsx:**
| type | amount | date | category_name | description | created_by |
|------|--------|------|---------------|-------------|------------|
| income | 150000 | 2024-12-15 | Water Billing | Payment from RT 01 | admin |
| expense | 50000 | 2024-12-14 | Pulsa Listrik Cangkring | Electricity bill | admin |

This approach ensures data integrity and makes the import process reliable for financial transaction management.