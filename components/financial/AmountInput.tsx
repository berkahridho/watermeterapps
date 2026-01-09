import { useState, useEffect } from 'react';
import { FiDollarSign } from 'react-icons/fi';

interface AmountInputProps {
  id: string;
  label: string;
  value: number;
  onChange: (amount: number) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  disabled?: boolean;
  className?: string;
}

export default function AmountInput({
  id,
  label,
  value,
  onChange,
  placeholder = 'Masukkan jumlah',
  required = false,
  error,
  disabled = false,
  className = ''
}: AmountInputProps) {
  const [displayValue, setDisplayValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  // Format number to Indonesian Rupiah format
  const formatToRupiah = (amount: number): string => {
    if (amount === 0) return '';
    return new Intl.NumberFormat('id-ID').format(amount);
  };

  // Parse Indonesian formatted number back to number
  const parseFromRupiah = (formatted: string): number => {
    if (!formatted) return 0;
    // Remove all non-digit characters except decimal separator
    const cleaned = formatted.replace(/[^\d]/g, '');
    return parseInt(cleaned) || 0;
  };

  // Update display value when prop value changes
  useEffect(() => {
    if (!isFocused) {
      setDisplayValue(formatToRupiah(value));
    }
  }, [value, isFocused]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    // Allow only digits and formatting characters during input
    const cleaned = inputValue.replace(/[^\d]/g, '');
    
    if (cleaned === '') {
      setDisplayValue('');
      onChange(0);
      return;
    }

    const numericValue = parseInt(cleaned);
    
    // Format for display while typing
    const formatted = new Intl.NumberFormat('id-ID').format(numericValue);
    setDisplayValue(formatted);
    
    // Update the actual value
    onChange(numericValue);
  };

  const handleFocus = () => {
    setIsFocused(true);
    // Show raw number when focused for easier editing
    if (value > 0) {
      setDisplayValue(value.toString());
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    // Format back to Rupiah display when not focused
    setDisplayValue(formatToRupiah(value));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow: backspace, delete, tab, escape, enter, home, end, left, right
    if ([8, 9, 27, 13, 46, 35, 36, 37, 39].indexOf(e.keyCode) !== -1 ||
        // Allow Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
        (e.keyCode === 65 && e.ctrlKey === true) ||
        (e.keyCode === 67 && e.ctrlKey === true) ||
        (e.keyCode === 86 && e.ctrlKey === true) ||
        (e.keyCode === 88 && e.ctrlKey === true)) {
      return;
    }
    // Ensure that it is a number and stop the keypress
    if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
      e.preventDefault();
    }
  };

  return (
    <div className={`w-full ${className}`}>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}
      </label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <span className="text-gray-500 dark:text-gray-400 text-sm font-medium">Rp</span>
        </div>
        <input
          type="text"
          id={id}
          value={displayValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className={`w-full px-4 py-3 border ${
            error 
              ? 'border-red-300 dark:border-red-700' 
              : 'border-gray-200 dark:border-gray-700'
          } rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white dark:bg-gray-700 dark:text-white pl-12 ${
            disabled ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        />
      </div>
      {error && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>}
      {value > 0 && !error && (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
          }).format(value)}
        </p>
      )}
    </div>
  );
}