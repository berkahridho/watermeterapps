import { ReactNode } from 'react';

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'gradient';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  className?: string;
}

export default function Button({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  className = ''
}: ButtonProps) {
  // Define base classes
  let baseClasses = "flex items-center justify-center rounded-xl font-medium transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 ";
  
  // Define size classes
  let sizeClasses = "";
  switch (size) {
    case 'sm':
      sizeClasses = "px-3 py-1.5 text-sm";
      break;
    case 'lg':
      sizeClasses = "px-6 py-3 text-base";
      break;
    case 'md':
    default:
      sizeClasses = "px-4 py-2 text-sm";
  }
  
  // Define variant classes
  let variantClasses = "";
  switch (variant) {
    case 'primary':
      variantClasses = disabled 
        ? "!bg-gray-300 dark:!bg-gray-600 !text-gray-500 dark:!text-gray-400 cursor-not-allowed" 
        : "!bg-blue-600 hover:!bg-blue-700 active:!bg-blue-800 !text-white shadow-sm focus:ring-blue-500 dark:!bg-blue-600 dark:hover:!bg-blue-700";
      break;
    case 'secondary':
      variantClasses = disabled 
        ? "bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed border border-gray-200 dark:border-gray-600" 
        : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-gray-500";
      break;
    case 'success':
      variantClasses = disabled 
        ? "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed" 
        : "bg-green-500 hover:bg-green-600 text-white focus:ring-green-500";
      break;
    case 'danger':
      variantClasses = disabled 
        ? "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed" 
        : "bg-red-500 hover:bg-red-600 text-white focus:ring-red-500";
      break;
    case 'gradient':
      variantClasses = disabled 
        ? "bg-gradient-to-r from-gray-400 to-gray-500 text-gray-200 cursor-not-allowed" 
        : "bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white focus:ring-blue-500";
      break;
  }

  // Combine classes
  const buttonClasses = baseClasses + sizeClasses + variantClasses + " " + className;
  
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={buttonClasses}
    >
      {loading ? (
        <>
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Loading...
        </>
      ) : (
        <>
          {icon && <span className="mr-2">{icon}</span>}
          {children}
        </>
      )}
    </button>
  );
}