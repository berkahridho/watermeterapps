import { ReactNode } from 'react';

interface Option {
  value: string;
  label: string;
}

interface SelectFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: Option[];
  placeholder?: string;
  required?: boolean;
  icon?: ReactNode;
  error?: string;
  disabled?: boolean;
  className?: string;
}

export default function SelectField({
  id,
  label,
  value,
  onChange,
  options,
  placeholder,
  required = false,
  icon,
  error,
  disabled = false,
  className = ''
}: SelectFieldProps) {
  return (
    <div className={`w-full ${className}`}>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}
      </label>
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {icon}
          </div>
        )}
        <select
          id={id}
          value={value}
          onChange={onChange}
          required={required}
          disabled={disabled}
          className={`w-full px-4 py-3 border ${
            error 
              ? 'border-red-300 dark:border-red-700' 
              : 'border-gray-200 dark:border-gray-700'
          } rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white dark:bg-gray-700 dark:text-white ${
            icon ? 'pl-10' : 'pl-4'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((option) => (
            <option 
              key={option.value} 
              value={option.value} 
              className="dark:bg-gray-700 dark:text-white"
            >
              {option.label}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}