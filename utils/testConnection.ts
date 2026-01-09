import { supabase } from '@/lib/supabase';

/**
 * Test the Supabase connection and database setup
 */
export async function testDatabaseConnection() {
  try {
    // Test basic connection
    const { data, error } = await supabase
      .from('customers')
      .select('count', { count: 'exact', head: true });

    if (error) {
      console.error('Database connection error:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      
      // Check if it's a table not found error
      if (error.code === 'PGRST116' || error.message.includes('relation') || error.message.includes('does not exist')) {
        console.error('❌ The "customers" table does not exist in your Supabase database.');
        console.log('📝 To fix this:');
        console.log('1. Go to your Supabase project dashboard');
        console.log('2. Navigate to the SQL Editor');
        console.log('3. Run the SQL commands from database-setup.sql');
        console.log('4. Or create the table manually in the Table Editor');
      }
      
      return { success: false, error };
    }

    return { success: true, count: data };
    
  } catch (error) {
    console.error('❌ Connection test failed:', error);
    return { success: false, error };
  }
}

/**
 * Test authentication status
 */
export async function testAuth() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error('Auth error:', error);
      return { success: false, error };
    }
    
    return { success: true, user };
  } catch (error) {
    console.error('❌ Auth test failed:', error);
    return { success: false, error };
  }
}