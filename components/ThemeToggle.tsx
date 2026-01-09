'use client';

import { FiSun, FiMoon } from 'react-icons/fi';
import { useTheme } from '@/lib/theme';

export default function ThemeToggle() {
  const { theme, toggleTheme, mounted } = useTheme();

  // Show a placeholder while mounting to prevent hydration mismatch
  if (!mounted) {
    return (
      <button className="p-2 rounded-lg w-10 h-10 flex items-center justify-center opacity-50 cursor-not-allowed bg-white border border-gray-200 shadow-sm">
        <div className="h-5 w-5" />
      </button>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 shadow-sm"
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {theme === 'light' ? (
        <FiMoon className="h-5 w-5 text-gray-700 dark:text-gray-300" />
      ) : (
        <FiSun className="h-5 w-5 text-yellow-500 dark:text-yellow-400" />
      )}
    </button>
  );
}