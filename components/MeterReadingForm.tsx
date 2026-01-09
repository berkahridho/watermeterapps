/**
 * Improved Meter Reading Form Component
 * Modern, fast, and beautiful UI with mobile-first design
 */

'use client';

import { useState, useEffect } from 'react';
import { FiDroplet, FiSave, FiAlertCircle, FiCheckCircle, FiInfo, FiUser, FiCalendar, FiTrendingUp, FiDollarSign } from 'react-icons/fi';
import { Customer } from '@/types/types';
import MeterDataService, { ValidationResult } from '@/lib/meterDataService';
import ValidationService from '@/lib/validationService';
import { offlineStorage } from '@/lib/offlineStorage';
import { formatDateID } from '@/utils/dateFormat';

interface MeterReadingFormProps {
  customers: Customer[];
  onReadingSubmitted?: () => void;
  onError?: (error: string) => void;
  initialCustomerId?: string;
  isOnline?: boolean;
}

interface FormData {
  customerId: string;
  reading: string;
  date: string;
}

interface ValidationState {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  isValidating: boolean;
}

export default function MeterReadingForm({
  customers,
  onReadingSubmitted,
  onError,
  initialCustomerId = '',
  isOnline = false
}: MeterReadingFormProps) {
  const [formData, setFormData] = useState<FormData>({
    customerId: initialCustomerId,
    reading: '',
    date: new Date().toISOString().split('T')[0]
  });

  const [validation, setValidation] = useState<ValidationState>({
    isValid: false,
    errors: [],
    warnings: [],
    isValidating: false
  });

  const [previousReading, setPreviousReading] = useState<any>(null);
  const [predictedUsage, setPredictedUsage] = useState<number | null>(null);
  const [estimatedBill, setEstimatedBill] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [syncAttempts, setSyncAttempts] = useState(0);
  const MAX_SYNC_ATTEMPTS = 3;

  // Get selected customer data
  const selectedCustomer = customers.find(c => c.id === formData.customerId);

  // Validate form whenever data changes
  useEffect(() => {
    if (formData.customerId && formData.reading && formData.date) {
      validateForm();
    } else {
      setValidation({
        isValid: false,
        errors: [],
        warnings: [],
        isValidating: false
      });
      setPreviousReading(null);
      setPredictedUsage(null);
      setEstimatedBill(null);
    }
  }, [formData]);

  const syncReadingWithServer = async (readingId: string, attempt: number = 1): Promise<boolean> => {
    if (!isOnline || attempt > MAX_SYNC_ATTEMPTS) {
      console.log(`Sync skipped: online=${isOnline}, attempt=${attempt}/${MAX_SYNC_ATTEMPTS}`);
      return false;
    }

    try {
      console.log(`Attempting to sync reading ${readingId} (attempt ${attempt}/${MAX_SYNC_ATTEMPTS})`);
      
      // Get the reading from offline storage
      const readings = offlineStorage.getReadings();
      const reading = readings.find(r => r.id === readingId);
      
      if (!reading) {
        console.error('Reading not found in offline storage');
        return false;
      }

      // Check if already synced - prevent duplicate inserts
      if (reading.synced) {
        return true;
      }

      // Import supabase here to avoid circular dependencies
      const { supabase } = await import('@/lib/supabase');

      // Try to sync to server
      const { data, error } = await supabase
        .from('meter_readings')
        .insert([{
          customer_id: reading.customer_id,
          reading: reading.reading,
          date: reading.date
        }]);

      if (error) {
        console.error(`Sync attempt ${attempt} failed:`, error);
        
        // Retry after a delay if we haven't exceeded max attempts
        if (attempt < MAX_SYNC_ATTEMPTS) {
          const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Exponential backoff: 1s, 2s, 4s
          console.log(`Retrying in ${delayMs}ms...`);
          
          await new Promise(resolve => setTimeout(resolve, delayMs));
          return syncReadingWithServer(readingId, attempt + 1);
        }
        
        return false;
      }

      // Mark as synced in offline storage IMMEDIATELY after successful insert
      offlineStorage.updateReading(readingId, { synced: true });
      
      return true;
    } catch (error) {
      console.error(`Sync error on attempt ${attempt}:`, error);
      
      // Retry if we haven't exceeded max attempts
      if (attempt < MAX_SYNC_ATTEMPTS) {
        const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.log(`Retrying in ${delayMs}ms...`);
        
        await new Promise(resolve => setTimeout(resolve, delayMs));
        return syncReadingWithServer(readingId, attempt + 1);
      }
      
      return false;
    }
  };

  const validateForm = async () => {
    setValidation(prev => ({ ...prev, isValidating: true }));

    try {
      const readingValue = parseFloat(formData.reading);
      
      // Basic number validation
      if (isNaN(readingValue)) {
        setValidation({
          isValid: false,
          errors: ['Pembacaan meter harus berupa angka'],
          warnings: [],
          isValidating: false
        });
        return;
      }

      // Get previous reading for context
      const prevReading = offlineStorage.getPreviousReading(formData.customerId, formData.date);
      setPreviousReading(prevReading);

      // Validate using the centralized service
      const validationResults = await ValidationService.validateMeterReading(readingValue, {
        customerId: formData.customerId,
        readingDate: formData.date,
        previousReading: prevReading ? {
          id: prevReading.id,
          customer_id: prevReading.customer_id,
          reading: prevReading.reading,
          date: prevReading.date
        } : undefined
      });

      const summary = ValidationService.getValidationSummary(validationResults);
      
      setValidation({
        isValid: summary.isValid,
        errors: ValidationService.formatValidationMessages(summary.errors),
        warnings: ValidationService.formatValidationMessages(summary.warnings),
        isValidating: false
      });

      // Calculate predicted usage and bill if validation passes
      if (summary.isValid && prevReading) {
        const usage = Math.max(0, readingValue - prevReading.reading);
        setPredictedUsage(usage);

        // Calculate estimated bill
        const billing = MeterDataService.calculateBilling(formData.customerId, usage, formData.date);
        setEstimatedBill(billing.finalAmount);
      }

    } catch (error) {
      console.error('Validation error:', error);
      setValidation({
        isValid: false,
        errors: ['Terjadi kesalahan saat validasi'],
        warnings: [],
        isValidating: false
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validation.isValid || isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      const readingValue = parseFloat(formData.reading);
      
      // Process the complete meter reading pipeline
      const result = await MeterDataService.processMeterReading(
        formData.customerId,
        readingValue,
        formData.date
      );

      if (!result.validation.isValid) {
        setValidation({
          isValid: false,
          errors: result.validation.errors,
          warnings: result.validation.warnings,
          isValidating: false
        });
        return;
      }

      // Save the reading
      const customerData = customers.find(c => c.id === formData.customerId);
      const readingId = offlineStorage.addReading({
        customer_id: formData.customerId,
        reading: readingValue,
        date: formData.date
      }, customerData?.name, customerData?.rt);

      // Reset form but keep the selected date
      const selectedDate = formData.date;
      setFormData({
        customerId: '',
        reading: '',
        date: selectedDate
      });
      
      // Attempt to sync if online
      if (isOnline) {
        console.log('Network is online, attempting to sync reading...');
        syncReadingWithServer(readingId);
      } else {
        console.log('Network is offline, reading saved locally for later sync');
      }
      
      // Notify parent component
      if (onReadingSubmitted) {
        onReadingSubmitted();
      }

    } catch (error) {
      console.error('Error submitting reading:', error);
      const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan saat menyimpan pembacaan';
      
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="card animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-modern">
          <FiDroplet className="text-2xl text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Input Pembacaan Meter
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Masukkan data pembacaan meter air pelanggan
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer Selection */}
        <div className="space-y-2">
          <label className="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300">
            <FiUser className="mr-2 text-blue-600" />
            Pilih Pelanggan
          </label>
          <select
            value={formData.customerId}
            onChange={(e) => handleInputChange('customerId', e.target.value)}
            className="input"
            required
          >
            <option value="">-- Pilih Pelanggan --</option>
            {customers.map(customer => (
              <option key={customer.id} value={customer.id}>
                {customer.name} {customer.rt ? `(${customer.rt})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Previous Reading Info */}
        {selectedCustomer && previousReading && (
          <div className="card-compact bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 animate-slide-up">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-800 rounded-lg flex items-center justify-center flex-shrink-0">
                <FiInfo className="text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  Pembacaan Terakhir
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-blue-700 dark:text-blue-300 font-medium">Tanggal:</span>
                    <p className="text-blue-800 dark:text-blue-200 font-mono">
                      {formatDateID(new Date(previousReading.date))}
                    </p>
                  </div>
                  <div>
                    <span className="text-blue-700 dark:text-blue-300 font-medium">Pembacaan:</span>
                    <p className="text-blue-800 dark:text-blue-200 font-mono text-lg font-bold">
                      {previousReading.reading.toLocaleString('id-ID')} m³
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Reading Input */}
        <div className="space-y-2">
          <label className="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300">
            <FiTrendingUp className="mr-2 text-green-600" />
            Pembacaan Meter (m³)
          </label>
          <input
            type="number"
            value={formData.reading}
            onChange={(e) => handleInputChange('reading', e.target.value)}
            className="input text-lg font-mono"
            placeholder="Masukkan pembacaan meter"
            min="0"
            step="1"
            required
          />
        </div>

        {/* Date Input */}
        <div className="space-y-2">
          <label className="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300">
            <FiCalendar className="mr-2 text-purple-600" />
            Tanggal Pembacaan
          </label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => handleInputChange('date', e.target.value)}
            className="input"
            required
          />
        </div>

        {/* Validation Messages */}
        {validation.isValidating && (
          <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl animate-pulse">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div>
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
              Memvalidasi pembacaan...
            </span>
          </div>
        )}

        {validation.errors.length > 0 && (
          <div className="alert-danger animate-scale-in">
            <div className="flex items-center gap-2 mb-3">
              <FiAlertCircle className="text-red-600 dark:text-red-400 flex-shrink-0" />
              <span className="font-semibold">Error Validasi</span>
            </div>
            <ul className="space-y-1">
              {validation.errors.map((error, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span className="text-red-500 mt-1">•</span>
                  <span>{error}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {validation.warnings.length > 0 && (
          <div className="alert-warning animate-scale-in">
            <div className="flex items-center gap-2 mb-3">
              <FiInfo className="text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
              <span className="font-semibold">Peringatan</span>
            </div>
            <ul className="space-y-1">
              {validation.warnings.map((warning, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span className="text-yellow-500 mt-1">•</span>
                  <span>{warning}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Usage and Bill Preview */}
        {validation.isValid && predictedUsage !== null && estimatedBill !== null && (
          <div className="card-compact bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 animate-scale-in">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-green-100 dark:bg-green-800 rounded-lg flex items-center justify-center flex-shrink-0">
                <FiCheckCircle className="text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-green-900 dark:text-green-100 mb-3">
                  Pratinjau Tagihan
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 dark:bg-green-800 rounded-xl flex items-center justify-center">
                      <FiTrendingUp className="text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-xs text-green-700 dark:text-green-300 font-medium">Pemakaian</p>
                      <p className="text-lg font-bold text-green-800 dark:text-green-200 font-mono">
                        {predictedUsage.toLocaleString('id-ID')} m³
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 dark:bg-green-800 rounded-xl flex items-center justify-center">
                      <FiDollarSign className="text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-xs text-green-700 dark:text-green-300 font-medium">Estimasi Tagihan</p>
                      <p className="text-lg font-bold text-green-800 dark:text-green-200 font-mono">
                        Rp {estimatedBill.toLocaleString('id-ID')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!validation.isValid || isSubmitting}
          className={`w-full btn-primary text-base font-semibold py-4 ${
            isSubmitting ? 'opacity-75 cursor-not-allowed' : ''
          }`}
        >
          {isSubmitting ? (
            <div className="flex items-center justify-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
              <span>Menyimpan Pembacaan...</span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-3">
              <FiSave className="text-lg" />
              <span>Simpan Pembacaan</span>
            </div>
          )}
        </button>
      </form>
    </div>
  );
}