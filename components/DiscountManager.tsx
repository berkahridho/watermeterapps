/**
 * Discount Manager Component
 * Allows admins to set and manage customer discounts
 */

'use client';

import { useState, useEffect } from 'react';
import { FiPercent, FiDollarSign, FiCalendar, FiUser, FiSave, FiX, FiEdit, FiTrash2 } from 'react-icons/fi';
import { Customer, CustomerDiscount } from '@/types/types';
import { offlineStorage } from '@/lib/offlineStorage';
import { formatDateID, formatMonthYearID } from '@/utils/dateFormat';

interface DiscountManagerProps {
  customers: Customer[];
  selectedCustomerId?: string;
  onDiscountSet?: (discount: CustomerDiscount) => void;
  onClose?: () => void;
}

export default function DiscountManager({ 
  customers, 
  selectedCustomerId, 
  onDiscountSet, 
  onClose 
}: DiscountManagerProps) {
  const [customerId, setCustomerId] = useState(selectedCustomerId || '');
  const [discountType, setDiscountType] = useState<'percentage' | 'amount'>('percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [reason, setReason] = useState('');
  const [discountMonth, setDiscountMonth] = useState(new Date().toISOString().substring(0, 7)); // YYYY-MM format
  const [existingDiscounts, setExistingDiscounts] = useState<CustomerDiscount[]>([]);
  const [editingDiscount, setEditingDiscount] = useState<CustomerDiscount | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{type: string, text: string} | null>(null);

  useEffect(() => {
    if (customerId) {
      loadCustomerDiscounts();
    }
  }, [customerId]);

  const loadCustomerDiscounts = () => {
    if (typeof window !== 'undefined') {
      const discounts = offlineStorage.getCustomerDiscounts(customerId);
      setExistingDiscounts(discounts);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!customerId) {
        throw new Error('Silakan pilih pelanggan');
      }

      if (!discountValue || parseFloat(discountValue) <= 0) {
        throw new Error('Silakan masukkan nilai diskon yang valid');
      }

      if (discountType === 'percentage' && parseFloat(discountValue) > 100) {
        throw new Error('Persentase diskon tidak boleh lebih dari 100%');
      }

      if (!reason.trim()) {
        throw new Error('Silakan masukkan alasan pemberian diskon');
      }

      const discountData: Omit<CustomerDiscount, 'id'> = {
        customer_id: customerId,
        discount_percentage: discountType === 'percentage' ? parseFloat(discountValue) : 0,
        discount_amount: discountType === 'amount' ? parseFloat(discountValue) : undefined,
        reason: reason.trim(),
        discount_month: discountMonth,
        created_by: 'admin', // In a real app, this would be the current user
        created_at: new Date().toISOString(),
        is_active: true,
      };

      let discountId: string;
      
      if (editingDiscount) {
        // Update existing discount
        const success = offlineStorage.updateDiscount(editingDiscount.id, discountData);
        if (!success) {
          throw new Error('Gagal memperbarui diskon');
        }
        discountId = editingDiscount.id;
        setMessage({ type: 'success', text: 'Diskon berhasil diperbarui!' });
      } else {
        // Create new discount
        discountId = offlineStorage.addDiscount(discountData);
        setMessage({ type: 'success', text: 'Diskon berhasil ditambahkan!' });
      }

      // Get the created/updated discount
      const createdDiscount = offlineStorage.getDiscounts().find(d => d.id === discountId);
      if (createdDiscount && onDiscountSet) {
        onDiscountSet(createdDiscount);
      }

      // Reset form
      resetForm();
      loadCustomerDiscounts();

      // Clear message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
      setTimeout(() => setMessage(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setDiscountValue('');
    setReason('');
    setDiscountMonth(new Date().toISOString().substring(0, 7));
    setEditingDiscount(null);
  };

  const handleEdit = (discount: CustomerDiscount) => {
    setEditingDiscount(discount);
    setDiscountType(discount.discount_percentage > 0 ? 'percentage' : 'amount');
    setDiscountValue((discount.discount_percentage > 0 ? discount.discount_percentage : discount.discount_amount || 0).toString());
    setReason(discount.reason);
    setDiscountMonth(discount.discount_month);
  };

  const handleDeactivate = (discount: CustomerDiscount) => {
    if (window.confirm('Apakah Anda yakin ingin menonaktifkan diskon ini?')) {
      offlineStorage.updateDiscount(discount.id, { is_active: false });
      loadCustomerDiscounts();
      setMessage({ type: 'success', text: 'Diskon berhasil dinonaktifkan' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const selectedCustomer = customers.find(c => c.id === customerId);
  const activeDiscount = existingDiscounts.find(d => d.is_active);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white flex items-center">
          <FiPercent className="mr-2 text-blue-500" />
          Kelola Diskon Pelanggan
        </h2>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <FiX className="h-5 w-5" />
          </button>
        )}
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded-xl ${
          message.type === 'success' 
            ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300' 
            : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
        }`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Customer Selection */}
        <div>
          <label htmlFor="customer" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Pelanggan
          </label>
          <select
            id="customer"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white dark:bg-gray-700 dark:text-white"
            required
            disabled={!!selectedCustomerId}
          >
            <option value="">Pilih pelanggan</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name} (RT: {customer.rt})
              </option>
            ))}
          </select>
        </div>

        {/* Discount Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Jenis Diskon
          </label>
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                value="percentage"
                checked={discountType === 'percentage'}
                onChange={(e) => setDiscountType(e.target.value as 'percentage')}
                className="mr-2"
              />
              <FiPercent className="mr-1" />
              Persentase (%)
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="amount"
                checked={discountType === 'amount'}
                onChange={(e) => setDiscountType(e.target.value as 'amount')}
                className="mr-2"
              />
              <FiDollarSign className="mr-1" />
              Jumlah Tetap (Rp)
            </label>
          </div>
        </div>

        {/* Discount Value */}
        <div>
          <label htmlFor="discountValue" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Nilai Diskon {discountType === 'percentage' ? '(%)' : '(Rp)'}
          </label>
          <input
            type="number"
            id="discountValue"
            value={discountValue}
            onChange={(e) => setDiscountValue(e.target.value)}
            min="0"
            max={discountType === 'percentage' ? "100" : undefined}
            step={discountType === 'percentage' ? "0.1" : "1000"}
            placeholder={discountType === 'percentage' ? 'Contoh: 10' : 'Contoh: 50000'}
            className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white dark:bg-gray-700 dark:text-white"
            required
          />
        </div>

        {/* Reason */}
        <div>
          <label htmlFor="reason" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Alasan Pemberian Diskon
          </label>
          <textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Contoh: Pelanggan lama, kesulitan ekonomi, dll."
            className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white dark:bg-gray-700 dark:text-white resize-none"
            required
          />
        </div>

        {/* Discount Month */}
        <div>
          <label htmlFor="discountMonth" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Bulan Diskon
          </label>
          <input
            type="month"
            id="discountMonth"
            value={discountMonth}
            onChange={(e) => setDiscountMonth(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white dark:bg-gray-700 dark:text-white"
            required
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Pilih bulan untuk pemberian diskon
          </p>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-5 py-3 rounded-xl font-medium hover:from-blue-600 hover:to-cyan-600 transition-all duration-300 flex items-center justify-center"
        >
          <FiSave className="mr-2" />
          {loading ? 'Menyimpan...' : editingDiscount ? 'Perbarui Diskon' : 'Simpan Diskon'}
        </button>

        {editingDiscount && (
          <button
            type="button"
            onClick={resetForm}
            className="w-full bg-gray-500 text-white px-5 py-3 rounded-xl font-medium hover:bg-gray-600 transition-all duration-300 flex items-center justify-center"
          >
            <FiX className="mr-2" />
            Batal Edit
          </button>
        )}
      </form>

      {/* Existing Discounts */}
      {selectedCustomer && existingDiscounts.length > 0 && (
        <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            Riwayat Diskon - {selectedCustomer.name}
          </h3>
          <div className="space-y-3">
            {existingDiscounts.map((discount) => (
              <div
                key={discount.id}
                className={`p-4 rounded-xl border ${
                  discount.is_active
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                    : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="font-semibold text-gray-800 dark:text-white">
                        {discount.discount_percentage > 0 
                          ? `${discount.discount_percentage}%` 
                          : `Rp ${discount.discount_amount?.toLocaleString('id-ID')}`
                        }
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        discount.is_active
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                          : 'bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                      }`}>
                        {discount.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      {discount.reason}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      Bulan: {formatMonthYearID(discount.discount_month)}
                    </p>
                  </div>
                  {discount.is_active && (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(discount)}
                        className="p-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                        title="Edit diskon"
                      >
                        <FiEdit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeactivate(discount)}
                        className="p-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                        title="Nonaktifkan diskon"
                      >
                        <FiTrash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Discount Summary */}
      {activeDiscount && (
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
          <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">
            Diskon Aktif Saat Ini
          </h4>
          <p className="text-blue-700 dark:text-blue-300">
            {activeDiscount.discount_percentage > 0 
              ? `${activeDiscount.discount_percentage}% diskon` 
              : `Rp ${activeDiscount.discount_amount?.toLocaleString('id-ID')} diskon`
            } - {activeDiscount.reason}
          </p>
        </div>
      )}
    </div>
  );
}