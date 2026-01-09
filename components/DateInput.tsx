import React, { useState, useEffect, useRef } from 'react';
import { FiCalendar, FiChevronLeft, FiChevronRight } from 'react-icons/fi';

interface DateInputProps {
  id?: string;
  value: string; // Expected in YYYY-MM-DD format
  onChange: (value: string) => void; // Returns YYYY-MM-DD format
  className?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export default function DateInput({
  id,
  value,
  onChange,
  className = '',
  required = false,
  disabled = false,
  placeholder = 'DD/MM/YYYY'
}: DateInputProps) {
  const [displayValue, setDisplayValue] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  // Indonesian month names
  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  // Convert YYYY-MM-DD to DD/MM/YYYY for display
  const formatForDisplay = (isoDate: string): string => {
    if (!isoDate) return '';
    const [year, month, day] = isoDate.split('-');
    return `${day}/${month}/${year}`;
  };

  // Convert DD/MM/YYYY to YYYY-MM-DD for storage
  const formatForStorage = (displayDate: string): string => {
    if (!displayDate) return '';
    const parts = displayDate.replace(/\D/g, ''); // Remove non-digits
    if (parts.length !== 8) return '';
    
    const day = parts.substring(0, 2);
    const month = parts.substring(2, 4);
    const year = parts.substring(4, 8);
    
    // Validate date parts
    const dayNum = parseInt(day);
    const monthNum = parseInt(month);
    const yearNum = parseInt(year);
    
    if (dayNum < 1 || dayNum > 31 || monthNum < 1 || monthNum > 12 || yearNum < 1900) {
      return '';
    }
    
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  };

  // Update display value when prop value changes
  useEffect(() => {
    setDisplayValue(formatForDisplay(value));
    if (value) {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        setCalendarDate(date);
      }
    }
  }, [value]);

  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowCalendar(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let inputValue = e.target.value;
    
    // Remove all non-digits
    const digits = inputValue.replace(/\D/g, '');
    
    // Format as DD/MM/YYYY while typing
    let formatted = '';
    if (digits.length > 0) {
      formatted = digits.substring(0, 2);
      if (digits.length > 2) {
        formatted += '/' + digits.substring(2, 4);
        if (digits.length > 4) {
          formatted += '/' + digits.substring(4, 8);
        }
      }
    }
    
    setDisplayValue(formatted);
    
    // Only call onChange if we have a complete date
    if (digits.length === 8) {
      const isoDate = formatForStorage(formatted);
      if (isoDate) {
        onChange(isoDate);
      }
    } else if (digits.length === 0) {
      onChange('');
    }
  };

  const handleBlur = () => {
    // Validate and format on blur
    if (displayValue) {
      const isoDate = formatForStorage(displayValue);
      if (isoDate) {
        onChange(isoDate);
        setDisplayValue(formatForDisplay(isoDate));
      } else {
        // Invalid date, clear it
        setDisplayValue('');
        onChange('');
      }
    }
  };

  const handleCalendarClick = () => {
    if (!disabled) {
      setShowCalendar(!showCalendar);
    }
  };

  const handleDateSelect = (date: Date) => {
    // Format date as YYYY-MM-DD without timezone conversion
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const isoDate = `${year}-${month}-${day}`;
    
    onChange(isoDate);
    setShowCalendar(false);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(calendarDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCalendarDate(newDate);
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const isSelectedDate = (date: Date | null) => {
    if (!date || !value) return false;
    const selectedDate = new Date(value);
    return date.toDateString() === selectedDate.toDateString();
  };

  const isToday = (date: Date | null) => {
    if (!date) return false;
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <FiCalendar className="text-gray-400 dark:text-gray-500" />
        </div>
        <input
          type="text"
          id={id}
          value={displayValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          maxLength={10}
          className={`w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white dark:bg-gray-700 dark:text-white pl-10 pr-10 ${className}`}
          required={required}
          disabled={disabled}
        />
        <button
          type="button"
          onClick={handleCalendarClick}
          disabled={disabled}
          className="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-blue-500 transition-colors"
        >
          <FiCalendar className="text-gray-400 dark:text-gray-500 hover:text-blue-500 dark:hover:text-blue-400" />
        </button>
      </div>

      {/* Calendar Popup */}
      {showCalendar && (
        <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-50 p-4 min-w-[280px]">
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={() => navigateMonth('prev')}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <FiChevronLeft className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            </button>
            
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              {monthNames[calendarDate.getMonth()]} {calendarDate.getFullYear()}
            </div>
            
            <button
              type="button"
              onClick={() => navigateMonth('next')}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <FiChevronRight className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            </button>
          </div>

          {/* Days of Week Header */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map(day => (
              <div key={day} className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-1">
            {getDaysInMonth(calendarDate).map((date, index) => (
              <button
                key={index}
                type="button"
                onClick={() => date && handleDateSelect(date)}
                disabled={!date}
                className={`
                  h-8 w-8 text-sm rounded-lg transition-colors
                  ${!date ? 'invisible' : ''}
                  ${isSelectedDate(date) 
                    ? 'bg-blue-500 text-white font-medium' 
                    : isToday(date)
                    ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 font-medium'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }
                `}
              >
                {date?.getDate()}
              </button>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="flex justify-between mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => {
                const today = new Date();
                const year = today.getFullYear();
                const month = String(today.getMonth() + 1).padStart(2, '0');
                const day = String(today.getDate()).padStart(2, '0');
                const isoDate = `${year}-${month}-${day}`;
                onChange(isoDate);
                setShowCalendar(false);
              }}
              className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
            >
              Hari Ini
            </button>
            <button
              type="button"
              onClick={() => setShowCalendar(false)}
              className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}