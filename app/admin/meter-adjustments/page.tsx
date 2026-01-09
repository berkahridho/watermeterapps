'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import MeterAdjustment from '@/components/MeterAdjustment';
import { Customer } from '@/types/types';
import { supabase } from '@/lib/supabase';

export default function MeterAdjustmentsPage() {
  const [user, setUser] = useState<any>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
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

      // Load customers
      loadCustomers();
    }
  }, [router]);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;

      const customersData: Customer[] = (data || []).map((row: any) => ({
        id: row.id.toString(),
        name: row.name,
        rt: row.rt || '',
        phone: row.phone || '',
      }));

      setCustomers(customersData);
    } catch (error) {
      console.error('Error loading customers:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!mounted || !user) {
    return null;
  }

  return (
    <ProtectedRoute requireAuth={true}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navigation user={user} currentPage="meter-adjustments" />
        
        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600 dark:text-gray-400">Memuat data...</span>
            </div>
          ) : (
            <MeterAdjustment 
              customers={customers} 
              onAdjustmentComplete={loadCustomers}
            />
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}