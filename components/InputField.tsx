import { ReactNode } from 'react';

interface InputFieldProps {
  id: string;
  label: string;
  type?: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  icon?: ReactNode;
  error?: string;
  disabled?: boolean;
  min?: string | number;
  step?: string | number;
  className?: string;
}

export default function InputField({
  id,
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  required = false,
  icon,
  error,
  disabled = false,
  min,
  step,
  className = ''
}: InputFieldProps) {
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
        <input
          type={type}
          id={id}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          min={min}
          step={step}
          className={`w-full px-4 py-3 border ${
            error 
              ? 'border-red-300 dark:border-red-700' 
              : 'border-gray-200 dark:border-gray-700'
          } rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white dark:bg-gray-700 dark:text-white ${
            icon ? 'pl-10' : 'pl-4'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        />
      </div>
      {error && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}