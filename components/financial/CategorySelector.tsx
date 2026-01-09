import { useState, useEffect } from 'react';
import { FiTag } from 'react-icons/fi';
import { TransactionCategory } from '@/types/financial';
import { FinancialService } from '@/lib/financialService';
import SelectField from '@/components/SelectField';

interface CategorySelectorProps {
  id: string;
  label: string;
  value: string;
  onChange: (categoryId: string) => void;
  transactionType: 'income' | 'expense';
  required?: boolean;
  error?: string;
  disabled?: boolean;
  className?: string;
}

export default function CategorySelector({
  id,
  label,
  value,
  onChange,
  transactionType,
  required = false,
  error,
  disabled = false,
  className = ''
}: CategorySelectorProps) {
  const [categories, setCategories] = useState<TransactionCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const financialService = new FinancialService();

  useEffect(() => {
    loadCategories();
  }, [transactionType]); // Add transactionType as dependency

  const loadCategories = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      
      // Use the new getCategoriesByType method for better performance
      const filteredCategories = await financialService.getCategoriesByType(transactionType);
      
      setCategories(filteredCategories);
    } catch (error) {
      console.error('Error loading categories:', error);
      setLoadError('Gagal memuat kategori');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(e.target.value);
  };

  // Convert categories to options format
  const options = categories.map(category => ({
    value: category.id,
    label: category.name
  }));

  if (loading) {
    return (
      <div className={`w-full ${className}`}>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
        </label>
        <div className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-700 animate-pulse">
          <div className="h-5 bg-gray-300 dark:bg-gray-600 rounded"></div>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className={`w-full ${className}`}>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
        </label>
        <div className="w-full px-4 py-3 border border-red-300 dark:border-red-700 rounded-xl bg-red-50 dark:bg-red-900/20">
          <p className="text-sm text-red-600 dark:text-red-400">{loadError}</p>
          <button
            type="button"
            onClick={loadCategories}
            className="mt-2 text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 underline"
          >
            Coba lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <SelectField
      id={id}
      label={label}
      value={value}
      onChange={handleSelectChange}
      options={options}
      placeholder={`Pilih kategori ${transactionType === 'income' ? 'pemasukan' : 'pengeluaran'}`}
      required={required}
      icon={<FiTag className="h-4 w-4" />}
      error={error}
      disabled={disabled}
      className={className}
    />
  );
}