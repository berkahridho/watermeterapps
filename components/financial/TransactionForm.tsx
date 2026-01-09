import { useState, useEffect } from 'react';
import { FiSave, FiX, FiFileText } from 'react-icons/fi';
import { Transaction, TransactionInput } from '@/types/financial';
import { ValidationService } from '@/lib/validationService';
import CategorySelector from './CategorySelector';
import AmountInput from './AmountInput';
import DateInput from '@/components/DateInput';
import InputField from '@/components/InputField';
import SelectField from '@/components/SelectField';
import Button from '@/components/Button';
import DuplicateWarningDialog from './DuplicateWarningDialog';

interface TransactionFormProps {
  transaction?: Transaction;
  onSubmit: (transaction: TransactionInput) => Promise<void>;
  onCancel: () => void;
  isEditing?: boolean;
}

interface FormData {
  type: 'income' | 'expense';
  amount: number;
  date: string; // YYYY-MM-DD format
  category_id: string;
  description: string;
}

interface FormErrors {
  type?: string;
  amount?: string;
  date?: string;
  category_id?: string;
  description?: string;
  general?: string;
}

export default function TransactionForm({
  transaction,
  onSubmit,
  onCancel,
  isEditing = false
}: TransactionFormProps) {
  const [formData, setFormData] = useState<FormData>({
    type: 'income',
    amount: 0,
    date: '',
    category_id: '',
    description: ''
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [duplicateTransactions, setDuplicateTransactions] = useState<Transaction[]>([]);
  const [pendingTransaction, setPendingTransaction] = useState<TransactionInput | null>(null);

  const validationService = new ValidationService();

  // Initialize form data when editing
  useEffect(() => {
    if (transaction && isEditing) {
      setFormData({
        type: transaction.type,
        amount: transaction.amount,
        date: transaction.date.toISOString().split('T')[0], // Convert to YYYY-MM-DD
        category_id: transaction.category_id,
        description: transaction.description
      });
    } else {
      // Set default date to today for new transactions
      const today = new Date();
      const todayString = today.toISOString().split('T')[0];
      setFormData(prev => ({
        ...prev,
        date: todayString
      }));
    }
  }, [transaction, isEditing]);

  const validateForm = async (): Promise<boolean> => {
    const newErrors: FormErrors = {};

    // Validate transaction type
    if (!formData.type) {
      newErrors.type = 'Jenis transaksi harus dipilih';
    }

    // Validate amount
    if (formData.amount <= 0) {
      newErrors.amount = 'Jumlah harus lebih besar dari 0';
    }

    // Validate date
    if (!formData.date) {
      newErrors.date = 'Tanggal harus diisi';
    } else {
      const selectedDate = new Date(formData.date);
      const today = new Date();
      today.setHours(23, 59, 59, 999); // Set to end of today
      
      if (selectedDate > today) {
        newErrors.date = 'Tanggal tidak boleh di masa depan';
      }
    }

    // Validate category
    if (!formData.category_id) {
      newErrors.category_id = 'Kategori harus dipilih';
    }

    // Validate description
    if (!formData.description.trim()) {
      newErrors.description = 'Deskripsi harus diisi';
    } else if (formData.description.trim().length < 3) {
      newErrors.description = 'Deskripsi minimal 3 karakter';
    }

    // Check for duplicate transactions (only for new transactions)
    if (!isEditing && Object.keys(newErrors).length === 0) {
      try {
        const transactionInput: TransactionInput = {
          type: formData.type,
          amount: formData.amount,
          date: new Date(formData.date),
          category_id: formData.category_id,
          description: formData.description.trim()
        };

        const duplicates = await validationService.findDuplicateTransactions(transactionInput);
        if (duplicates.length > 0) {
          setDuplicateTransactions(duplicates);
          setPendingTransaction(transactionInput);
          setShowDuplicateDialog(true);
          return false; // Stop validation here, let user decide
        }
      } catch (error) {
        console.error('Error checking duplicate:', error);
        // Don't block submission if duplicate check fails
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent, forceDuplicate = false) => {
    e.preventDefault();
    
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      setErrors({});

      // Skip duplicate check if user confirmed or if we're forcing duplicate
      if (!forceDuplicate) {
        const isValid = await validateForm();
        if (!isValid) {
          return;
        }
      }

      const transactionInput: TransactionInput = forceDuplicate && pendingTransaction 
        ? pendingTransaction 
        : {
            type: formData.type,
            amount: formData.amount,
            date: new Date(formData.date),
            category_id: formData.category_id,
            description: formData.description.trim()
          };

      await onSubmit(transactionInput);
      
      // Reset form after successful submission (only for new transactions)
      if (!isEditing) {
        setFormData({
          type: 'income',
          amount: 0,
          date: new Date().toISOString().split('T')[0],
          category_id: '',
          description: ''
        });
      }
      
      // Reset duplicate dialog state
      setShowDuplicateDialog(false);
      setDuplicateTransactions([]);
      setPendingTransaction(null);
    } catch (error) {
      console.error('Error submitting transaction:', error);
      setErrors({
        general: error instanceof Error ? error.message : 'Terjadi kesalahan saat menyimpan transaksi'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear related errors when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }

    // Clear general errors when form changes
    if (errors.general) {
      setErrors(prev => ({
        ...prev,
        general: undefined
      }));
    }

    // Close duplicate dialog if form changes
    if (showDuplicateDialog) {
      setShowDuplicateDialog(false);
      setDuplicateTransactions([]);
      setPendingTransaction(null);
    }
  };

  const transactionTypeOptions = [
    { value: 'income', label: 'Pemasukan' },
    { value: 'expense', label: 'Pengeluaran' }
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          {isEditing ? 'Edit Transaksi' : 'Tambah Transaksi Baru'}
        </h2>
        <button
          type="button"
          onClick={onCancel}
          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <FiX className="h-5 w-5" />
        </button>
      </div>

      <form onSubmit={(e) => handleSubmit(e)} className="space-y-6">
        {/* General Error */}
        {errors.general && (
          <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-700 dark:text-red-300">
              {errors.general}
            </p>
          </div>
        )}

        {/* Transaction Type */}
        <SelectField
          id="transaction-type"
          label="Jenis Transaksi"
          value={formData.type}
          onChange={(e) => handleInputChange('type', e.target.value as 'income' | 'expense')}
          options={transactionTypeOptions}
          required
          error={errors.type}
          disabled={isSubmitting}
        />

        {/* Amount */}
        <AmountInput
          id="transaction-amount"
          label="Jumlah"
          value={formData.amount}
          onChange={(amount) => handleInputChange('amount', amount)}
          placeholder="Masukkan jumlah dalam Rupiah"
          required
          error={errors.amount}
          disabled={isSubmitting}
        />

        {/* Date */}
        <div>
          <label htmlFor="transaction-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Tanggal
          </label>
          <DateInput
            id="transaction-date"
            value={formData.date}
            onChange={(date) => handleInputChange('date', date)}
            required
            disabled={isSubmitting}
          />
          {errors.date && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.date}</p>}
        </div>

        {/* Category */}
        <CategorySelector
          id="transaction-category"
          label="Kategori"
          value={formData.category_id}
          onChange={(categoryId) => handleInputChange('category_id', categoryId)}
          transactionType={formData.type}
          required
          error={errors.category_id}
          disabled={isSubmitting}
        />

        {/* Description */}
        <InputField
          id="transaction-description"
          label="Deskripsi"
          type="text"
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          placeholder="Masukkan deskripsi transaksi"
          required
          icon={<FiFileText className="h-4 w-4" />}
          error={errors.description}
          disabled={isSubmitting}
        />

        {/* Form Actions */}
        <div className="flex gap-3 pt-4">
          <Button
            type="submit"
            disabled={isSubmitting}
            variant="primary"
            className="flex-1 !bg-blue-600 hover:!bg-blue-700 disabled:!bg-gray-400 !text-white !border-0"
          >
            <FiSave className="h-4 w-4 mr-2" />
            {isSubmitting ? 'Menyimpan...' : (isEditing ? 'Update Transaksi' : 'Simpan Transaksi')}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Batal
          </Button>
        </div>
      </form>

      {/* Duplicate Warning Dialog */}
      <DuplicateWarningDialog
        isOpen={showDuplicateDialog}
        onClose={() => {
          setShowDuplicateDialog(false);
          setDuplicateTransactions([]);
          setPendingTransaction(null);
        }}
        onConfirm={() => {
          const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
          handleSubmit(fakeEvent, true);
        }}
        duplicateTransactions={duplicateTransactions}
        newTransaction={pendingTransaction || {
          type: formData.type,
          amount: formData.amount,
          date: new Date(formData.date),
          category_id: formData.category_id,
          description: formData.description.trim()
        }}
      />
    </div>
  );
}