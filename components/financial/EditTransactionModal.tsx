import { useState, useEffect } from 'react';
import { Transaction, TransactionInput, TransactionCategory } from '@/types/financial';
import { FiX, FiSave, FiLoader } from 'react-icons/fi';
import Button from '@/components/Button';
import AmountInput from './AmountInput';
import CategorySelector from './CategorySelector';
import DateInput from '@/components/DateInput';

interface EditTransactionModalProps {
  transaction: Transaction | null;
  categories: TransactionCategory[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, updates: Partial<TransactionInput>) => Promise<void>;
  loading?: boolean;
}

export default function EditTransactionModal({
  transaction,
  categories,
  isOpen,
  onClose,
  onSave,
  loading = false
}: EditTransactionModalProps) {
  const [formData, setFormData] = useState<TransactionInput>({
    type: 'expense',
    amount: 0,
    date: new Date(),
    category_id: '',
    description: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Initialize form data when transaction changes
  useEffect(() => {
    if (transaction) {
      setFormData({
        type: transaction.type,
        amount: transaction.amount,
        date: transaction.date,
        category_id: transaction.category_id,
        description: transaction.description
      });
      setErrors({});
    }
  }, [transaction]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setErrors({});
      setSaving(false);
    }
  }, [isOpen]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (formData.amount <= 0) {
      newErrors.amount = 'Amount must be greater than zero';
    }

    if (!formData.category_id) {
      newErrors.category_id = 'Category is required';
    }

    if (formData.date > new Date()) {
      newErrors.date = 'Date cannot be in the future';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!transaction || !validateForm()) {
      return;
    }

    setSaving(true);
    try {
      // Only send fields that have changed
      const updates: Partial<TransactionInput> = {};
      
      if (formData.type !== transaction.type) {
        updates.type = formData.type;
      }
      if (formData.amount !== transaction.amount) {
        updates.amount = formData.amount;
      }
      if (formData.date.getTime() !== transaction.date.getTime()) {
        updates.date = formData.date;
      }
      if (formData.category_id !== transaction.category_id) {
        updates.category_id = formData.category_id;
      }
      if (formData.description !== transaction.description) {
        updates.description = formData.description;
      }

      await onSave(transaction.id, updates);
      onClose();
    } catch (error) {
      console.error('Error updating transaction:', error);
      setErrors({ submit: 'Failed to update transaction. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const handleTypeChange = (type: 'income' | 'expense') => {
    setFormData(prev => ({ ...prev, type }));
    // Reset category when type changes
    setFormData(prev => ({ ...prev, category_id: '' }));
    if (errors.category_id) {
      setErrors(prev => ({ ...prev, category_id: '' }));
    }
  };

  if (!isOpen || !transaction) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          {/* Header */}
          <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                Edit Transaction
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <FiX className="h-6 w-6" />
              </button>
            </div>

            {/* Form */}
            <form id="edit-transaction-form" onSubmit={handleSubmit} className="space-y-4">
              {/* Transaction Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Transaction Type
                </label>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="type"
                      value="income"
                      checked={formData.type === 'income'}
                      onChange={() => handleTypeChange('income')}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Income</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="type"
                      value="expense"
                      checked={formData.type === 'expense'}
                      onChange={() => handleTypeChange('expense')}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Expense</span>
                  </label>
                </div>
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description *
                </label>
                <input
                  type="text"
                  id="description"
                  value={formData.description}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, description: e.target.value }));
                    if (errors.description) {
                      setErrors(prev => ({ ...prev, description: '' }));
                    }
                  }}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 ${
                    errors.description 
                      ? 'border-red-300 dark:border-red-600' 
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="Enter transaction description"
                />
                {errors.description && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.description}</p>
                )}
              </div>

              {/* Amount */}
              <div>
                <AmountInput
                  id="amount"
                  label="Amount *"
                  value={formData.amount}
                  onChange={(amount) => {
                    setFormData(prev => ({ ...prev, amount }));
                    if (errors.amount) {
                      setErrors(prev => ({ ...prev, amount: '' }));
                    }
                  }}
                  error={errors.amount}
                />
              </div>

              {/* Category */}
              <div>
                <CategorySelector
                  id="category"
                  label="Category *"
                  value={formData.category_id}
                  onChange={(categoryId) => {
                    setFormData(prev => ({ ...prev, category_id: categoryId }));
                    if (errors.category_id) {
                      setErrors(prev => ({ ...prev, category_id: '' }));
                    }
                  }}
                  transactionType={formData.type}
                  error={errors.category_id}
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Date *
                </label>
                <DateInput
                  id="date"
                  value={formData.date.toISOString().split('T')[0]}
                  onChange={(dateString) => {
                    const date = new Date(dateString);
                    setFormData(prev => ({ ...prev, date }));
                    if (errors.date) {
                      setErrors(prev => ({ ...prev, date: '' }));
                    }
                  }}
                />
                {errors.date && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.date}</p>
                )}
              </div>

              {/* Submit Error */}
              {errors.submit && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400">{errors.submit}</p>
                </div>
              )}
            </form>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <Button
              type="submit"
              variant="primary"
              loading={saving}
              icon={saving ? <FiLoader /> : <FiSave />}
              onClick={() => {
                const form = document.getElementById('edit-transaction-form') as HTMLFormElement;
                if (form) {
                  form.requestSubmit();
                }
              }}
              className="w-full sm:w-auto sm:ml-3"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={saving}
              className="mt-3 w-full sm:mt-0 sm:w-auto"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}