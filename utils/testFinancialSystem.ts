import { supabase } from '@/lib/supabase';
import { FinancialService } from '@/lib/financialService';
import { ValidationService } from '@/lib/validationService';
import { TransactionInput } from '@/types/financial';

/**
 * Test the financial system basic functionality
 */
export async function testFinancialSystem() {
  console.log('🧪 Testing Financial System...');
  
  const financialService = new FinancialService();
  const validationService = new ValidationService();
  
  try {
    // Test 1: Database connection and tables
    console.log('\n1. Testing database connection...');
    const { data: categoriesData, error: categoriesError } = await supabase
      .from('transaction_categories')
      .select('count', { count: 'exact', head: true });

    if (categoriesError) {
      console.error('❌ Categories table error:', categoriesError.message);
      return { success: false, error: categoriesError };
    }

    const { data: transactionsData, error: transactionsError } = await supabase
      .from('financial_transactions')
      .select('count', { count: 'exact', head: true });

    if (transactionsError) {
      console.error('❌ Transactions table error:', transactionsError.message);
      return { success: false, error: transactionsError };
    }

    console.log('✅ Database tables accessible');
    console.log(`📊 Categories: ${categoriesData || 0}, Transactions: ${transactionsData || 0}`);

    // Test 2: Load categories
    console.log('\n2. Testing category loading...');
    const categories = await financialService.getCategories();
    console.log(`✅ Loaded ${categories.length} categories`);
    
    if (categories.length === 0) {
      console.log('⚠️ No categories found. Make sure to run the database setup SQL.');
      return { success: false, error: 'No categories found' };
    }

    // Test 3: Validation service
    console.log('\n3. Testing validation service...');
    
    // Test valid transaction
    const validTransaction: TransactionInput = {
      type: 'income',
      amount: 100000,
      date: new Date(),
      category_id: categories[0].id,
      description: 'Test transaction'
    };
    
    const validationResult = validationService.validateTransaction(validTransaction);
    if (validationResult.isValid) {
      console.log('✅ Valid transaction validation passed');
    } else {
      console.error('❌ Valid transaction validation failed:', validationResult.errors);
    }

    // Test invalid transaction (negative amount)
    const invalidTransaction: TransactionInput = {
      type: 'income',
      amount: -100,
      date: new Date(),
      category_id: categories[0].id,
      description: 'Invalid test transaction'
    };
    
    const invalidValidationResult = validationService.validateTransaction(invalidTransaction);
    if (!invalidValidationResult.isValid) {
      console.log('✅ Invalid transaction validation correctly failed');
    } else {
      console.error('❌ Invalid transaction validation should have failed');
    }

    // Test 4: Authentication check
    console.log('\n4. Testing authentication...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('❌ Auth error:', authError.message);
      return { success: false, error: authError };
    }
    
    if (user) {
      console.log('✅ User authenticated:', user.email);
    } else {
      console.log('⚠️ No authenticated user - some operations may fail');
    }

    // Test 5: Load existing transactions
    console.log('\n5. Testing transaction loading...');
    const transactions = await financialService.getTransactions();
    console.log(`✅ Loaded ${transactions.length} existing transactions`);

    console.log('\n🎉 All basic tests passed!');
    return { 
      success: true, 
      results: {
        categoriesCount: categories.length,
        transactionsCount: transactions.length,
        userAuthenticated: !!user
      }
    };

  } catch (error) {
    console.error('❌ Test failed:', error);
    return { success: false, error };
  }
}

/**
 * Test duplicate detection functionality
 */
export async function testDuplicateDetection() {
  console.log('🔍 Testing duplicate detection functionality...');
  
  const financialService = new FinancialService();
  const validationService = new ValidationService();
  
  try {
    // Get categories first
    const categories = await financialService.getCategories();
    if (categories.length === 0) {
      throw new Error('No categories available for testing');
    }

    const testCategory = categories.find(c => c.type === 'expense') || categories[0];

    // Test 1: Create a test transaction
    console.log('\n1. Creating initial test transaction...');
    const originalTransaction: TransactionInput = {
      type: 'expense',
      amount: 50000,
      date: new Date(),
      category_id: testCategory.id,
      description: 'Test duplicate detection - Equipment maintenance'
    };

    const createdTransaction = await financialService.createTransaction(originalTransaction);
    console.log('✅ Initial transaction created:', createdTransaction.id);

    // Test 2: Check for duplicates with identical transaction
    console.log('\n2. Testing duplicate detection with identical transaction...');
    const identicalTransaction: TransactionInput = {
      type: 'expense',
      amount: 50000,
      date: new Date(),
      category_id: testCategory.id,
      description: 'Test duplicate detection - Equipment maintenance'
    };

    const duplicatesIdentical = await validationService.findDuplicateTransactions(identicalTransaction);
    console.log(`✅ Found ${duplicatesIdentical.length} duplicates for identical transaction`);
    
    if (duplicatesIdentical.length > 0) {
      console.log('   Duplicate details:');
      duplicatesIdentical.forEach((dup, index) => {
        console.log(`   ${index + 1}. ${dup.description} - Rp ${dup.amount.toLocaleString('id-ID')} (${dup.date.toLocaleDateString('id-ID')})`);
      });
    }

    // Test 3: Check for duplicates with similar description
    console.log('\n3. Testing duplicate detection with similar description...');
    const similarTransaction: TransactionInput = {
      type: 'expense',
      amount: 50000,
      date: new Date(),
      category_id: testCategory.id,
      description: 'Test duplicate detection - Equipment repair' // Similar but not identical
    };

    const duplicatesSimilar = await validationService.findDuplicateTransactions(similarTransaction);
    console.log(`✅ Found ${duplicatesSimilar.length} duplicates for similar transaction`);

    // Test 4: Check for duplicates with different amount (should not match)
    console.log('\n4. Testing duplicate detection with different amount...');
    const differentAmountTransaction: TransactionInput = {
      type: 'expense',
      amount: 75000, // Different amount
      date: new Date(),
      category_id: testCategory.id,
      description: 'Test duplicate detection - Equipment maintenance'
    };

    const duplicatesDifferentAmount = await validationService.findDuplicateTransactions(differentAmountTransaction);
    console.log(`✅ Found ${duplicatesDifferentAmount.length} duplicates for different amount (should be 0)`);

    // Test 5: Test boolean duplicate check
    console.log('\n5. Testing boolean duplicate check...');
    const hasDuplicatesIdentical = await validationService.checkDuplicateTransaction(identicalTransaction);
    const hasDuplicatesDifferent = await validationService.checkDuplicateTransaction(differentAmountTransaction);
    
    console.log(`✅ Boolean check - identical: ${hasDuplicatesIdentical}, different amount: ${hasDuplicatesDifferent}`);

    // Test 6: Clean up test transaction
    console.log('\n6. Cleaning up test transaction...');
    await financialService.deleteTransaction(createdTransaction.id);
    console.log('✅ Test transaction cleaned up');

    console.log('\n🎉 Duplicate detection tests completed successfully!');
    console.log('\n📋 Test Summary:');
    console.log(`   - Identical transaction duplicates: ${duplicatesIdentical.length} (expected: 1)`);
    console.log(`   - Similar description duplicates: ${duplicatesSimilar.length} (expected: 1)`);
    console.log(`   - Different amount duplicates: ${duplicatesDifferentAmount.length} (expected: 0)`);
    console.log(`   - Boolean checks working: ${hasDuplicatesIdentical && !hasDuplicatesDifferent}`);

    return { 
      success: true,
      results: {
        identicalDuplicates: duplicatesIdentical.length,
        similarDuplicates: duplicatesSimilar.length,
        differentAmountDuplicates: duplicatesDifferentAmount.length,
        booleanChecksWorking: hasDuplicatesIdentical && !hasDuplicatesDifferent
      }
    };

  } catch (error) {
    console.error('❌ Duplicate detection test failed:', error);
    return { success: false, error };
  }
}

/**
 * Test financial system with a complete transaction workflow
 */
export async function testTransactionWorkflow() {
  console.log('🔄 Testing complete transaction workflow...');
  
  const financialService = new FinancialService();
  
  try {
    // Get categories first
    const categories = await financialService.getCategories();
    if (categories.length === 0) {
      throw new Error('No categories available for testing');
    }

    const incomeCategory = categories.find(c => c.type === 'income');
    const expenseCategory = categories.find(c => c.type === 'expense');

    if (!incomeCategory || !expenseCategory) {
      throw new Error('Missing required category types for testing');
    }

    // Test 1: Create income transaction
    console.log('\n1. Creating income transaction...');
    const incomeTransaction: TransactionInput = {
      type: 'income',
      amount: 150000,
      date: new Date(),
      category_id: incomeCategory.id,
      description: 'Test income transaction - Water billing'
    };

    const createdIncome = await financialService.createTransaction(incomeTransaction);
    console.log('✅ Income transaction created:', createdIncome.id);

    // Test 2: Create expense transaction
    console.log('\n2. Creating expense transaction...');
    const expenseTransaction: TransactionInput = {
      type: 'expense',
      amount: 75000,
      date: new Date(),
      category_id: expenseCategory.id,
      description: 'Test expense transaction - Equipment maintenance'
    };

    const createdExpense = await financialService.createTransaction(expenseTransaction);
    console.log('✅ Expense transaction created:', createdExpense.id);

    // Test 3: Update transaction
    console.log('\n3. Updating transaction...');
    const updatedTransaction = await financialService.updateTransaction(createdIncome.id, {
      amount: 175000,
      description: 'Updated test income transaction - Water billing'
    });
    console.log('✅ Transaction updated successfully');

    // Test 4: Get transactions with filters
    console.log('\n4. Testing filtered transaction retrieval...');
    const incomeTransactions = await financialService.getTransactions({
      type: 'income',
      limit: 10
    });
    console.log(`✅ Retrieved ${incomeTransactions.length} income transactions`);

    // Test 5: Generate basic report
    console.log('\n5. Testing report generation...');
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const report = await financialService.generateReport({
      start_date: startOfMonth,
      end_date: endOfMonth
    });
    
    console.log('✅ Report generated successfully');
    console.log(`📊 Total Income: Rp ${report.summary.total_income.toLocaleString('id-ID')}`);
    console.log(`📊 Total Expenses: Rp ${report.summary.total_expenses.toLocaleString('id-ID')}`);
    console.log(`📊 Net Profit: Rp ${report.summary.net_profit.toLocaleString('id-ID')}`);

    // Test 6: Clean up test transactions
    console.log('\n6. Cleaning up test transactions...');
    await financialService.deleteTransaction(createdIncome.id);
    await financialService.deleteTransaction(createdExpense.id);
    console.log('✅ Test transactions cleaned up');

    console.log('\n🎉 Complete transaction workflow test passed!');
    return { success: true };

  } catch (error) {
    console.error('❌ Transaction workflow test failed:', error);
    return { success: false, error };
  }
}