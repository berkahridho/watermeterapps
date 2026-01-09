'use client';

import { useState, useEffect } from 'react';
import { FiTool, FiAlertTriangle, FiSave, FiX, FiEdit3, FiRefreshCw } from 'react-icons/fi';
import { Customer } from '@/types/types';
import { supabase } from '@/lib/supabase';
import { formatDateID } from '@/utils/dateFormat';

interface MeterAdjustment {
  id: string;
  customer_id: string;
  old_reading: number;
  new_reading: number;
  adjustment_type: 'gauge_replacement' | 'manual_correction' | 'meter_reset';
  reason: string;
  adjustment_date: string;
  created_by: string;
  created_at: string;
  notes?: string;
  customer?: Customer;
}

interface MeterAdjustmentProps {
  customers: Customer[];
  onAdjustmentComplete?: () => void;
}

export default function MeterAdjustment({ customers, onAdjustmentComplete }: MeterAdjustmentProps) {
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [oldReading, setOldReading] = useState('');
  const [newReading, setNewReading] = useState('');
  const [adjustmentType, setAdjustmentType] = useState<'gauge_replacement' | 'manual_correction' | 'meter_reset'>('gauge_replacement');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [adjustmentDate, setAdjustmentDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{type: string, text: string} | null>(null);
  const [adjustments, setAdjustments] = useState<MeterAdjustment[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [currentReading, setCurrentReading] = useState<{reading: number, date: string} | null>(null);

  useEffect(() => {
    loadAdjustments();
  }, []);

  // Load current reading when customer is selected
  useEffect(() => {
    if (selectedCustomer) {
      loadCurrentReading(selectedCustomer);
    } else {
      setCurrentReading(null);
      setOldReading('');
    }
  }, [selectedCustomer]);

  const loadCurrentReading = async (customerId: string) => {
    try {
      // Get the latest reading for this customer
      const { data, error } = await supabase
        .from('meter_readings')
        .select('reading, date')
        .eq('customer_id', customerId)
        .order('date', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        setCurrentReading({
          reading: data[0].reading,
          date: data[0].date
        });
        setOldReading(data[0].reading.toString());
      } else {
        setCurrentReading(null);
        setOldReading('0');
      }
    } catch (error) {
      console.error('Error loading current reading:', error);
    }
  };

  const loadAdjustments = async () => {
    try {
      const { data, error } = await supabase
        .from('meter_adjustments')
        .select(`
          *,
          customers (
            id,
            name,
            rt,
            phone
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setAdjustments(data || []);
    } catch (error) {
      console.error('Error loading adjustments:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      // Validation
      if (!selectedCustomer || !oldReading || !newReading || !reason.trim()) {
        throw new Error('Semua field wajib diisi');
      }

      const oldReadingNum = parseFloat(oldReading);
      const newReadingNum = parseFloat(newReading);

      if (isNaN(oldReadingNum) || isNaN(newReadingNum)) {
        throw new Error('Pembacaan meter harus berupa angka yang valid');
      }

      if (oldReadingNum < 0 || newReadingNum < 0) {
        throw new Error('Pembacaan meter tidak boleh negatif');
      }

      // Get current user
      const userData = localStorage.getItem('user');
      const user = userData ? JSON.parse(userData) : null;
      const createdBy = user?.email || 'admin';

      // Insert adjustment record
      const { error } = await supabase
        .from('meter_adjustments')
        .insert({
          customer_id: selectedCustomer,
          old_reading: oldReadingNum,
          new_reading: newReadingNum,
          adjustment_type: adjustmentType,
          reason: reason.trim(),
          adjustment_date: adjustmentDate,
          created_by: createdBy,
          notes: notes.trim() || null
        });

      if (error) throw error;

      // If this is a gauge replacement, we might want to add a new meter reading
      // with the new reading value to maintain continuity
      if (adjustmentType === 'gauge_replacement' && newReadingNum > 0) {
        const { error: readingError } = await supabase
          .from('meter_readings')
          .insert({
            customer_id: selectedCustomer,
            reading: newReadingNum,
            date: adjustmentDate,
            created_at: new Date().toISOString()
          });

        if (readingError) {
          console.warn('Could not create meter reading for adjustment:', readingError);
        }
      }

      setMessage({
        type: 'success',
        text: 'Penyesuaian meter berhasil disimpan!'
      });

      // Reset form
      setSelectedCustomer('');
      setOldReading('');
      setNewReading('');
      setReason('');
      setNotes('');
      setAdjustmentDate(new Date().toISOString().split('T')[0]);
      setShowForm(false);

      // Reload adjustments
      loadAdjustments();
      
      // Notify parent component
      if (onAdjustmentComplete) {
        onAdjustmentComplete();
      }

      // Clear message after 3 seconds
      setTimeout(() => setMessage(null), 3000);

    } catch (error: any) {
      console.error('Error saving adjustment:', error);
      setMessage({
        type: 'error',
        text: error.message || 'Gagal menyimpan penyesuaian meter'
      });
    } finally {
      setLoading(false);
    }
  };

  const getAdjustmentTypeLabel = (type: string) => {
    switch (type) {
      case 'gauge_replacement': return 'Penggantian Gauge';
      case 'manual_correction': return 'Koreksi Manual';
      case 'meter_reset': return 'Reset Meter';
      default: return type;
    }
  };

  const getAdjustmentTypeColor = (type: string) => {
    switch (type) {
      case 'gauge_replacement': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'manual_correction': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'meter_reset': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
            <FiTool className="mr-2 text-blue-500" />
            Penyesuaian Meter
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
            Kelola penggantian gauge dan penyesuaian pembacaan meter
          </p>
        </div>
        
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-4 py-2 rounded-xl font-medium hover:from-blue-600 hover:to-cyan-600 transition-all duration-300 flex items-center"
        >
          {showForm ? <FiX className="mr-2" /> : <FiEdit3 className="mr-2" />}
          {showForm ? 'Tutup Form' : 'Buat Penyesuaian'}
        </button>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-xl ${
          message.type === 'success' 
            ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300' 
            : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
        }`}>
          <div className="flex items-center">
            {message.type === 'success' ? (
              <FiRefreshCw className="h-4 w-4 mr-2" />
            ) : (
              <FiAlertTriangle className="h-4 w-4 mr-2" />
            )}
            <span>{message.text}</span>
          </div>
        </div>
      )}

      {/* Adjustment Form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            Buat Penyesuaian Meter Baru
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Customer Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Pelanggan *
                </label>
                <select
                  value={selectedCustomer}
                  onChange={(e) => setSelectedCustomer(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white dark:bg-gray-700 dark:text-white"
                  required
                >
                  <option value="">Pilih pelanggan</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} (RT: {customer.rt})
                    </option>
                  ))}
                </select>
              </div>

              {/* Adjustment Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Jenis Penyesuaian *
                </label>
                <select
                  value={adjustmentType}
                  onChange={(e) => setAdjustmentType(e.target.value as any)}
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white dark:bg-gray-700 dark:text-white"
                  required
                >
                  <option value="gauge_replacement">Penggantian Gauge</option>
                  <option value="manual_correction">Koreksi Manual</option>
                  <option value="meter_reset">Reset Meter</option>
                </select>
              </div>

              {/* Current Reading Display */}
              {currentReading && (
                <div className="md:col-span-2">
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      <strong>Pembacaan Terakhir:</strong> {currentReading.reading} m³ 
                      pada {formatDateID(currentReading.date)}
                    </p>
                  </div>
                </div>
              )}

              {/* Old Reading */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Pembacaan Lama (m³) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={oldReading}
                  onChange={(e) => setOldReading(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white dark:bg-gray-700 dark:text-white"
                  placeholder="Pembacaan sebelum penyesuaian"
                  required
                />
              </div>

              {/* New Reading */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Pembacaan Baru (m³) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={newReading}
                  onChange={(e) => setNewReading(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white dark:bg-gray-700 dark:text-white"
                  placeholder="Pembacaan setelah penyesuaian"
                  required
                />
              </div>

              {/* Adjustment Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tanggal Penyesuaian *
                </label>
                <input
                  type="date"
                  value={adjustmentDate}
                  onChange={(e) => setAdjustmentDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>

              {/* Reason */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Alasan Penyesuaian *
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white dark:bg-gray-700 dark:text-white"
                  placeholder="Jelaskan alasan penyesuaian (contoh: Gauge rusak dan diganti dengan yang baru)"
                  required
                />
              </div>

              {/* Notes */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Catatan Tambahan
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white dark:bg-gray-700 dark:text-white"
                  placeholder="Catatan tambahan (opsional)"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={loading}
                className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-3 rounded-xl font-medium hover:from-green-600 hover:to-emerald-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {loading ? (
                  <FiRefreshCw className="animate-spin mr-2" />
                ) : (
                  <FiSave className="mr-2" />
                )}
                {loading ? 'Menyimpan...' : 'Simpan Penyesuaian'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Adjustments History */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            Riwayat Penyesuaian Meter
          </h3>

          {adjustments.length === 0 ? (
            <div className="text-center py-8">
              <FiTool className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600 mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                Belum ada penyesuaian meter yang dilakukan
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Pelanggan
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Jenis
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Pembacaan
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Tanggal
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Alasan
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Dibuat Oleh
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {adjustments.map((adjustment) => (
                    <tr key={adjustment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {adjustment.customer?.name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          RT: {adjustment.customer?.rt}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getAdjustmentTypeColor(adjustment.adjustment_type)}`}>
                          {getAdjustmentTypeLabel(adjustment.adjustment_type)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        <div className="flex items-center">
                          <span className="text-red-600 dark:text-red-400">{adjustment.old_reading} m³</span>
                          <span className="mx-2 text-gray-400">→</span>
                          <span className="text-green-600 dark:text-green-400 font-medium">{adjustment.new_reading} m³</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {formatDateID(adjustment.adjustment_date)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white max-w-xs">
                        <div className="truncate" title={adjustment.reason}>
                          {adjustment.reason}
                        </div>
                        {adjustment.notes && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate" title={adjustment.notes}>
                            {adjustment.notes}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {adjustment.created_by}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}