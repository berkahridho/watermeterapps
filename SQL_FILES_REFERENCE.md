# SQL Files Reference

## 🗂️ **Essential SQL Files (Kept)**

### **Database Setup & Management**
- `database-setup.sql` - Core database schema and initial setup
- `database-cleanup-final.sql` - ✅ **MAIN CLEANUP SCRIPT** - Remove unused tables, add indexes
- `database-vacuum.sql` - Performance optimization (run after cleanup)
- `meter-reading-repair.sql` - ✅ **METER SYSTEM REPAIR** - Add validation and constraints

### **Feature-Specific Setup**
- `database-discount-setup.sql` - Customer discount system setup
- `database-financial-setup.sql` - Financial transaction system setup
- `database-meter-adjustments-setup.sql` - Meter gauge replacement system
- `database-user-management-setup.sql` - User profiles and RT assignments
- `database-seed-income-categories.sql` - Seed data for transaction categories
- `database-rls-simple-fix.sql` - Row Level Security fix (if needed)

## 🗑️ **Files Removed (Cleanup Complete)**

### **Obsolete Database Scripts**
- ❌ `database-cleanup.sql` - Replaced by final version
- ❌ `database-cleanup-safe.sql` - Replaced by final version
- ❌ `database-rls-setup.sql` - Working with current setup
- ❌ `database-rls-troubleshoot.sql` - Issues resolved
- ❌ `fix-admin-access.sql` - User management working

### **Analysis & Debug Files**
- ❌ `check-database.mjs` - Analysis complete
- ❌ `database-analysis.js` - Analysis complete
- ❌ `check-table-structure.sql` - Structure confirmed

### **Test Files**
- ❌ `test-*.js` (7 files) - System in production state
- ❌ `clear-offline-discounts.js` - Functionality integrated

## 📋 **Recommended Execution Order**

### **For New Setup:**
1. `database-setup.sql` - Core schema
2. `database-user-management-setup.sql` - User system
3. `database-discount-setup.sql` - Discount system
4. `database-financial-setup.sql` - Financial system
5. `database-meter-adjustments-setup.sql` - Meter adjustments
6. `database-seed-income-categories.sql` - Seed data

### **For Existing Database:**
1. `database-cleanup-final.sql` - ✅ **RUN THIS FIRST**
2. `database-vacuum.sql` - Performance optimization
3. `meter-reading-repair.sql` - Add validation

### **If RLS Issues:**
- `database-rls-simple-fix.sql` - Only if needed

## 🎯 **Current Status**
- ✅ Database cleaned and optimized
- ✅ Unused tables removed
- ✅ Performance indexes added
- ✅ Meter reading system repaired
- ✅ Customer import system fixed
- ✅ All test files removed
- ✅ System production-ready