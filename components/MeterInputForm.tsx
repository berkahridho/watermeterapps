import { useState } from 'react';
import { Customer } from '@/types/types';
import { FiDroplet, FiCalendar, FiRefreshCw } from 'react-icons/fi';

interface MeterInputFormProps {
  customers: Customer[];
  onSubmit: (data: { customerId: string; reading: number; date: string }) => void;
}

export default function MeterInputForm({ customers, onSubmit }: MeterInputFormProps) {
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [reading, setReading] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // In a real app, this would submit to an API
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call
    
    onSubmit({
      customerId: selectedCustomer,
      reading: parseFloat(reading),
      date
    });
    
    setReading('');
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="customer" className="block text-gray-700 mb-2">
            Customer
          </label>
          <select
            id="customer"
            value={selectedCustomer}
            onChange={(e) => setSelectedCustomer(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Select a customer</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name} ({customer.id})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="date" className="block text-gray-700 mb-2">
            Reading Date
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiCalendar className="text-gray-400" />
            </div>
            <input
              type="date"
              id="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
        </div>

        <div className="md:col-span-2">
          <label htmlFor="reading" className="block text-gray-700 mb-2">
            Current Meter Reading (m³)
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiDroplet className="text-gray-400" />
            </div>
            <input
              type="number"
              id="reading"
              value={reading}
              onChange={(e) => setReading(e.target.value)}
              min="0"
              step="0.01"
              placeholder="Enter meter reading"
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <p className="mt-1 text-sm text-gray-500">Enter the current reading from the water meter</p>
        </div>
      </div>

      <div className="mt-6">
        <button
          type="submit"
          disabled={loading}
          className={`bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center ${
            loading ? 'opacity-75 cursor-not-allowed' : ''
          }`}
        >
          {loading ? (
            <>
              <FiRefreshCw className="animate-spin mr-2" /> Saving...
            </>
          ) : (
            <>
              <FiDroplet className="mr-2" /> Save Reading
            </>
          )}
        </button>
      </div>
    </form>
  );
}