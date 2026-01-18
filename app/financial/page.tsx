'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navigation from '@/components/Navigation';
import FinancialDashboard from '@/components/financial/FinancialDashboard';
import { FiLock, FiAlertCircle } from 'react-icons/fi';

export default function FinancialPage() {
  const [user, setUser] = useState<any>(null);
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();

  useEffect(() => {
    // Get user data from localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      
      // Allow viewer and admin access to financial reports
      // Block only non-admin, non-viewer users from financial management
      const isAuthorizedForFinancial = parsedUser?.email === 'admin@example.com' || 
                                      parsedUser?.role === 'admin' || 
                                      parsedUser?.role === 'viewer';
      setIsAuthorized(isAuthorizedForFinancial);
    }
    setLoading(false);
  }, []);

  // Show loading state while checking authentication
  if (loading) {
    return (
      <ProtectedRoute requireAuth={true}>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  // Show unauthorized message if user doesn't have admin privileges
  if (!isAuthorized) {
    return (
      <ProtectedRoute requireAuth={true}>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          <Navigation user={user} currentPage="financial" />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center">
              <div className="mx-auto flex justify-center">
                <div className="bg-red-100 dark:bg-red-900/20 p-4 rounded-full">
                  <FiLock className="h-12 w-12 text-red-600 dark:text-red-400" />
                </div>
              </div>
              <h1 className="mt-6 text-2xl font-bold text-gray-900 dark:text-white">
                Access Denied
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                You don't have permission to access the financial management system. 
                This feature is restricted to administrators only.
              </p>
              <div className="mt-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 max-w-md mx-auto">
                <div className="flex items-start">
                  <FiAlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 mr-3 flex-shrink-0" />
                  <div className="text-left">
                    <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                      Administrator Access Required
                    </h3>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                      Please contact your system administrator to request access to financial management features.
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-6">
                <button
                  onClick={() => router.push('/dashboard')}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  Return to Dashboard
                </button>
              </div>
            </div>
          </main>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requireAuth={true}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navigation user={user} currentPage="financial" />
        <main>
          <FinancialDashboard 
            userRole={user?.role === 'viewer' ? 'viewer' : 'admin'} 
            initialTransactions={[]}
          />
        </main>
      </div>
    </ProtectedRoute>
  );
}