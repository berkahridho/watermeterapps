'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FiUser, FiDroplet, FiBarChart2, FiDollarSign, FiAlertCircle } from 'react-icons/fi';
import { testDatabaseConnection } from '@/utils/testConnection';
import Navigation from '@/components/Navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardMetrics from '@/components/DashboardMetrics';

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [dbError, setDbError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
    } else {
      setUser(JSON.parse(userData));
      checkDatabaseConnection();
    }
  }, [router]);

  const checkDatabaseConnection = async () => {
    try {
      setDbError(null);
      
      // Test database connection
      const connectionTest = await testDatabaseConnection();
      
      if (!connectionTest.success) {
        const error = connectionTest.error as any;
        if (error?.code === 'PGRST116' || error?.message?.includes('relation') || error?.message?.includes('does not exist')) {
          setDbError('Database tables not found. Please run the database setup script.');
        } else {
          setDbError(`Database error: ${error?.message || 'Unknown error'}`);
        }
      }
      
    } catch (error) {
      console.error('Error checking database connection:', error);
      setDbError('Failed to connect to database');
    }
  };

  if (!user) {
    return null; // Render nothing while checking authentication
  }

  return (
    <ProtectedRoute requireAuth={true}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navigation user={user} currentPage="dashboard" />
        
        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-400">Water meter system overview and RT payment tracking</p>
          </div>

          {/* Database Error Alert */}
          {dbError && (
            <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
              <div className="flex items-start">
                <FiAlertCircle className="h-5 w-5 text-red-500 dark:text-red-400 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Database Connection Issue</h3>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">{dbError}</p>
                  <div className="mt-2 text-sm text-red-600 dark:text-red-400">
                    <p>To fix this:</p>
                    <ol className="list-decimal list-inside mt-1 space-y-1">
                      <li>Go to your Supabase project dashboard</li>
                      <li>Navigate to the SQL Editor</li>
                      <li>Run the SQL commands from <code className="bg-red-100 dark:bg-red-800 px-1 rounded">database-setup.sql</code></li>
                      <li>For financial features, also run <code className="bg-red-100 dark:bg-red-800 px-1 rounded">database-financial-setup.sql</code></li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Dashboard Metrics */}
          <DashboardMetrics className="mb-8" />

          {/* Quick Actions */}
          {/* <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link href="/customers" className="bg-white dark:bg-gray-800 p-5 text-center flex flex-col items-center justify-center rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md dark:hover:bg-gray-700 transition-all duration-300 ease-out">
                <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mb-3 shadow-[0_4px_16px_rgba(0,0,0,0.05)]">
                  <FiUser className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-medium text-gray-900 dark:text-white">Customers</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Manage customer information</p>
              </Link>

              <Link href="/meter" className="bg-white dark:bg-gray-800 p-5 text-center flex flex-col items-center justify-center rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md dark:hover:bg-gray-700 transition-all duration-300 ease-out">
                <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-2xl flex items-center justify-center mb-3 shadow-[0_4px_16px_rgba(0,0,0,0.05)]">
                  <FiDroplet className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-medium text-gray-900 dark:text-white">Meter Reading</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Record new meter readings</p>
              </Link>

              <Link href="/reports" className="bg-white dark:bg-gray-800 p-5 text-center flex flex-col items-center justify-center rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md dark:hover:bg-gray-700 transition-all duration-300 ease-out">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mb-3 shadow-[0_4px_16px_rgba(0,0,0,0.05)]">
                  <FiBarChart2 className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-medium text-gray-900 dark:text-white">Reports</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">View usage reports</p>
              </Link>

              <Link href="/financial" className="bg-white dark:bg-gray-800 p-5 text-center flex flex-col items-center justify-center rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md dark:hover:bg-gray-700 transition-all duration-300 ease-out">
                <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mb-3 shadow-[0_4px_16px_rgba(0,0,0,0.05)]">
                  <FiDollarSign className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-medium text-gray-900 dark:text-white">Financial</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Track RT payments & income</p>
              </Link>
            </div>
          </div> */}
        </main>
      </div>
    </ProtectedRoute>
  );
}