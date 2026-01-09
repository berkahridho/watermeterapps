'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import DataImport from '@/components/DataImport';

export default function ImportPage() {
  const [user, setUser] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    
    // Check if user is logged in and is admin
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
    } else {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      
      // Check if user is admin - support both demo admin and real admin users
      const isAdmin = parsedUser.email === 'admin@example.com' || 
                      parsedUser.role === 'admin' ||
                      parsedUser.isDemo === true;
      
      if (!isAdmin) {
        alert('Access denied. Admin privileges required.');
        router.push('/dashboard');
        return;
      }
    }
  }, [router]);

  if (!mounted || !user) {
    return null;
  }

  return (
    <ProtectedRoute requireAuth={true}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navigation user={user} currentPage="data-import" />
        
        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <DataImport />
        </main>
      </div>
    </ProtectedRoute>
  );
}