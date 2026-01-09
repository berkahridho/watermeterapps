'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { FiUser, FiEdit, FiPlus, FiSearch, FiTrash2, FiPlusCircle, FiX } from 'react-icons/fi';
import { Customer } from '@/types/types';
import { supabase } from '@/lib/supabase';
import Navigation from '@/components/Navigation';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function Customers() {
  const [user, setUser] = useState<any>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [rtFilter, setRtFilter] = useState('');
  const [sortConfig, setSortConfig] = useState<{key: string; direction: 'asc' | 'desc'} | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', rt: '', phone: '' });
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
    } else {
      setUser(JSON.parse(userData));
      fetchCustomers();
    }
  }, [router]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      console.log('Fetching customers from Supabase...');
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching customers:', error);
        alert(`Error fetching customers: ${error.message}`);
        return;
      }

      console.log('Customers data received:', data);

      if (data) {
        // Transform the data to match Customer type
        const customersData: Customer[] = data.map((row: any) => ({
          id: row.id.toString(),
          name: row.name,
          rt: row.rt,
          phone: row.phone,
        }));

        setCustomers(customersData);
      }
    } catch (error: any) {
      console.error('Error fetching customers:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter(customer =>
    (customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.rt?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.id.includes(searchTerm) ||
    customer.phone?.includes(searchTerm)) &&
    (rtFilter === '' || customer.rt === rtFilter)
  );

  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editForm, setEditForm] = useState({ name: '', rt: '', phone: '' });

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      console.log('Adding customer:', newCustomer);
      const { data, error } = await supabase
        .from('customers')
        .insert([
          {
            name: newCustomer.name,
            rt: newCustomer.rt,
            phone: newCustomer.phone,
          }
        ])
        .select();

      if (error) {
        console.error('Error adding customer:', error);
        alert(`Error adding customer: ${error.message}`);
        return;
      }

      console.log('Customer added:', data);

      // Add the new customer to the local state
      if (data && data.length > 0) {
        const newCustomerObj: Customer = {
          id: data[0].id.toString(),
          name: data[0].name,
          rt: data[0].rt,
          phone: data[0].phone,
        };
        setCustomers([...customers, newCustomerObj]);
      }
      
      setNewCustomer({ name: '', rt: '', phone: '' });
      setShowAddForm(false);
    } catch (error: any) {
      console.error('Error adding customer:', error);
      alert(`Error: ${error.message}`);
    }
  };

  const handleEditClick = (customer: Customer) => {
    setEditingCustomer(customer);
    setEditForm({ name: customer.name, rt: customer.rt || '', phone: customer.phone || '' });
  };

  const handleUpdateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCustomer) {
      try {
        console.log('Updating customer:', editingCustomer.id, editForm);
        const { error } = await supabase
          .from('customers')
          .update({
            name: editForm.name,
            rt: editForm.rt,
            phone: editForm.phone,
          })
          .eq('id', editingCustomer.id);

        if (error) {
          console.error('Error updating customer:', error);
          alert(`Error updating customer: ${error.message}`);
          return;
        }

        // Update the customer in the local state
        const updatedCustomers = customers.map(cus =>
          cus.id === editingCustomer.id 
            ? { ...cus, name: editForm.name, rt: editForm.rt, phone: editForm.phone } 
            : cus
        );
        setCustomers(updatedCustomers);
        setEditingCustomer(null);
        setEditForm({ name: '', rt: '', phone: '' });
      } catch (error: any) {
        console.error('Error updating customer:', error);
        alert(`Error: ${error.message}`);
      }
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    if (confirm('Are you sure you want to delete this customer?')) {
      try {
        console.log('Deleting customer:', id);
        const { error } = await supabase
          .from('customers')
          .delete()
          .eq('id', id);

        if (error) {
          console.error('Error deleting customer:', error);
          alert(`Error deleting customer: ${error.message}`);
          return;
        }

        // Remove the customer from the local state
        const updatedCustomers = customers.filter(customer => customer.id !== id);
        setCustomers(updatedCustomers);
        console.log('Customer deleted successfully');
      } catch (error: any) {
        console.error('Error deleting customer:', error);
        alert(`Error: ${error.message}`);
      }
    }
  };



  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedCustomers = React.useMemo(() => {
    let sortableItems = [...filteredCustomers];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const aValue = a[sortConfig.key as keyof Customer] || '';
        const bValue = b[sortConfig.key as keyof Customer] || '';
        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [filteredCustomers, sortConfig]);

  if (!user) {
    return null;
  }

  return (
    <ProtectedRoute requireAuth={true}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navigation user={user} currentPage="customers" />
        
        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Customers</h1>
                <p className="text-gray-600 dark:text-gray-400">Manage customer information</p>
              </div>
              <button 
                onClick={() => setShowAddForm(!showAddForm)}
                className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-5 py-2.5 rounded-xl font-medium hover:from-blue-600 hover:to-cyan-600 transition-all duration-300 flex items-center relative overflow-hidden"
              >
                <FiPlusCircle className="mr-2" /> 
                {showAddForm ? 'Cancel' : 'Add Customer'}
              </button>
            </div>
          </div>

          {/* Add Customer Form */}
          {showAddForm && (
            <div className="bg-white dark:bg-gray-800 mb-6 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Add New Customer</h2>
                <button 
                  onClick={() => setShowAddForm(false)}
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  <FiX className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleAddCustomer} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      value={newCustomer.name}
                      onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white dark:bg-gray-700 dark:text-white pl-4"
                      placeholder="Enter customer name"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      id="phone"
                      value={newCustomer.phone}
                      onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white dark:bg-gray-700 dark:text-white pl-4"
                      placeholder="Enter phone number"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label htmlFor="rt" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      RT
                    </label>
                    <select
                      id="rt"
                      value={newCustomer.rt}
                      onChange={(e) => setNewCustomer({...newCustomer, rt: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white dark:bg-gray-700 dark:text-white"
                      required
                    >
                      <option value="" className="dark:bg-gray-700 dark:text-white">Select RT</option>
                      <option value="001" className="dark:bg-gray-700 dark:text-white">001</option>
                      <option value="002" className="dark:bg-gray-700 dark:text-white">002</option>
                      <option value="003" className="dark:bg-gray-700 dark:text-white">003</option>
                      <option value="004" className="dark:bg-gray-700 dark:text-white">004</option>
                      <option value="005" className="dark:bg-gray-700 dark:text-white">005</option>
                    </select>
                  </div>
                </div>
                <div>
                  <button
                    type="submit"
                    className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-5 py-2.5 rounded-xl font-medium hover:from-blue-600 hover:to-cyan-600 transition-all duration-300 relative overflow-hidden"
                  >
                    <FiPlus className="mr-2" /> Add Customer
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Edit Customer Form */}
          {editingCustomer && (
            <div className="bg-white dark:bg-gray-800 mb-6 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Edit Customer</h2>
                <button 
                  onClick={() => {
                    setEditingCustomer(null);
                    setEditForm({ name: '', rt: '', phone: '' });
                  }}
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  <FiX className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleUpdateCustomer} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="editName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      id="editName"
                      value={editForm.name}
                      onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white dark:bg-gray-700 dark:text-white pl-4"
                      placeholder="Enter customer name"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="editPhone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      id="editPhone"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white dark:bg-gray-700 dark:text-white pl-4"
                      placeholder="Enter phone number"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label htmlFor="editRt" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      RT
                    </label>
                    <select
                      id="editRt"
                      value={editForm.rt}
                      onChange={(e) => setEditForm({...editForm, rt: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white dark:bg-gray-700 dark:text-white"
                      required
                    >
                      <option value="" className="dark:bg-gray-700 dark:text-white">Select RT</option>
                      <option value="001" className="dark:bg-gray-700 dark:text-white">001</option>
                      <option value="002" className="dark:bg-gray-700 dark:text-white">002</option>
                      <option value="003" className="dark:bg-gray-700 dark:text-white">003</option>
                      <option value="004" className="dark:bg-gray-700 dark:text-white">004</option>
                      <option value="005" className="dark:bg-gray-700 dark:text-white">005</option>
                    </select>
                  </div>
                </div>
                <div>
                  <button
                    type="submit"
                    className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-5 py-2.5 rounded-xl font-medium hover:from-blue-600 hover:to-cyan-600 transition-all duration-300 relative overflow-hidden mr-2"
                  >
                    <FiEdit className="mr-2" /> Update Customer
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCustomer(null);
                      setEditForm({ name: '', rt: '', phone: '' });
                    }}
                    className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-5 py-2.5 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-300"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="bg-white dark:bg-gray-800 overflow-hidden rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            {/* Search and Filter */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="relative w-full sm:w-64">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiSearch className="text-gray-400 dark:text-gray-500" />
                  </div>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search customers..."
                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white dark:bg-gray-700 dark:text-white pl-10"
                  />
                </div>
                <div className="flex space-x-2">
                  <button className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600 transition-all duration-300 text-sm">
                    Export
                  </button>
                  <select 
                    value={rtFilter}
                    onChange={(e) => setRtFilter(e.target.value)}
                    className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600 transition-all duration-300 text-sm"
                  >
                    <option value="" className="dark:bg-gray-700 dark:text-white">All RTs</option>
                    <option value="001" className="dark:bg-gray-700 dark:text-white">001</option>
                    <option value="002" className="dark:bg-gray-700 dark:text-white">002</option>
                    <option value="003" className="dark:bg-gray-700 dark:text-white">003</option>
                    <option value="004" className="dark:bg-gray-700 dark:text-white">004</option>
                    <option value="005" className="dark:bg-gray-700 dark:text-white">005</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Customers Table */}
            {loading ? (
              <div className="p-12 text-center">
                <div className="flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
                <p className="mt-4 text-gray-600">Loading customers...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 rounded-xl overflow-hidden">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">ID</th>
                      <th 
                        className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:text-gray-900 dark:hover:text-gray-100"
                        onClick={() => requestSort('name')}
                      >
                        <div className="flex items-center">
                          Name
                          {sortConfig?.key === 'name' && (
                            <span className="ml-1">
                              {sortConfig.direction === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </th>
                      <th 
                        className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:text-gray-900 dark:hover:text-gray-100"
                        onClick={() => requestSort('rt')}
                      >
                        <div className="flex items-center">
                          RT
                          {sortConfig?.key === 'rt' && (
                            <span className="ml-1">
                              {sortConfig.direction === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Phone</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {sortedCustomers.length > 0 ? (
                      sortedCustomers.map((customer) => (
                        <tr key={customer.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-300 ease-out">
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{sortedCustomers.indexOf(customer) + 1}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">{customer.name}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{customer.rt || 'N/A'}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{customer.phone || 'N/A'}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end space-x-2">
                              <button 
                                onClick={() => handleEditClick(customer)}
                                className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 p-2 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all duration-300 ease-out"
                              >
                                <FiEdit className="h-4 w-4" />
                              </button>
                              <button 
                                onClick={() => handleDeleteCustomer(customer.id)}
                                className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-all duration-300 ease-out"
                              >
                                <FiTrash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
                          <div className="flex flex-col items-center justify-center">
                            <FiUser className="h-10 w-10 text-gray-300 dark:text-gray-600 mb-2" />
                            <p>No customers found</p>
                            <p className="text-sm mt-1">Try adjusting your search query</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}