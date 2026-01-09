import { useState, useEffect } from 'react';
import { TransactionFilters, TransactionCategory } from '@/types/financial';
import { FiFilter, FiSearch, FiX, FiCalendar, FiTag, FiTrendingUp, FiTrendingDown } from 'react-icons/fi';
import InputField from '@/components/InputField';
import SelectField from '@/components/SelectField';
import DateInput from '@/components/DateInput';
import Button from '@/components/Button';

interface FilterPanelProps {
  filters: TransactionFilters;
  onFiltersChange: (filters: TransactionFilters) => void;
  categories: TransactionCategory[];
  className?: string;
}

export default function FilterPanel({
  filters,
  onFiltersChange,
  categories,
  className = ''
}: FilterPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localFilters, setLocalFilters] = useState<TransactionFilters>(filters);

  // Update local filters when props change
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  // Check if any filters are active
  const hasActiveFilters = () => {
    return (
      (filters.type && filters.type !== 'all') ||
      (filters.category_ids && filters.category_ids.length > 0) ||
      filters.date_from ||
      filters.date_to ||
      (filters.search_term && filters.search_term.trim() !== '')
    );
  };

  const handleFilterChange = (key: keyof TransactionFilters, value: any) => {
    const updatedFilters = { ...localFilters, [key]: value };
    setLocalFilters(updatedFilters);
    onFiltersChange(updatedFilters);
  };

  const handleDateRangeChange = (dateFrom?: Date, dateTo?: Date) => {
    const updatedFilters = { 
      ...localFilters, 
      date_from: dateFrom, 
      date_to: dateTo 
    };
    setLocalFilters(updatedFilters);
    onFiltersChange(updatedFilters);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const searchTerm = e.target.value;
    handleFilterChange('search_term', searchTerm);
  };

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const type = e.target.value as 'income' | 'expense' | 'all';
    handleFilterChange('type', type);
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const categoryId = e.target.value;
    if (categoryId === '') {
      handleFilterChange('category_ids', []);
    } else {
      // For now, support single category selection
      // Can be extended to multi-select later
      handleFilterChange('category_ids', [categoryId]);
    }
  };

  const handleDateFromChange = (dateString: string) => {
    const date = dateString ? new Date(dateString) : undefined;
    handleFilterChange('date_from', date);
  };

  const handleDateToChange = (dateString: string) => {
    const date = dateString ? new Date(dateString) : undefined;
    handleFilterChange('date_to', date);
  };

  const clearAllFilters = () => {
    const clearedFilters: TransactionFilters = {
      type: 'all',
      category_ids: [],
      date_from: undefined,
      date_to: undefined,
      search_term: '',
      sort_by: 'date',
      sort_order: 'desc'
    };
    setLocalFilters(clearedFilters);
    onFiltersChange(clearedFilters);
  };

  const clearDateFilters = () => {
    handleDateRangeChange(undefined, undefined);
  };

  // Prepare category options
  const categoryOptions = [
    { value: '', label: 'All Categories' },
    ...categories.map(category => ({
      value: category.id,
      label: category.name
    }))
  ];

  // Prepare type options
  const typeOptions = [
    { value: 'all', label: 'All Types' },
    { value: 'income', label: 'Income' },
    { value: 'expense', label: 'Expense' }
  ];

  // Format dates for DateInput (expects YYYY-MM-DD)
  const formatDateForInput = (date?: Date): string => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Filter Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <FiFilter className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              Filter Transactions
            </h3>
            {hasActiveFilters() && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                Active
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {hasActiveFilters() && (
              <Button
                variant="secondary"
                size="sm"
                onClick={clearAllFilters}
                icon={<FiX />}
              >
                Clear All
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="md:hidden"
            >
              {isExpanded ? 'Hide' : 'Show'} Filters
            </Button>
          </div>
        </div>
      </div>

      {/* Search Bar - Always Visible */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <InputField
          id="transaction-search"
          label="Search Transactions"
          type="text"
          value={localFilters.search_term || ''}
          onChange={handleSearchChange}
          placeholder="Search by description..."
          icon={<FiSearch className="h-4 w-4 text-gray-400 dark:text-gray-500" />}
        />
      </div>

      {/* Filter Controls */}
      <div className={`${isExpanded ? 'block' : 'hidden'} md:block`}>
        <div className="p-4 space-y-4">
          {/* Type and Category Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SelectField
              id="transaction-type"
              label="Transaction Type"
              value={localFilters.type || 'all'}
              onChange={handleTypeChange}
              options={typeOptions}
              icon={localFilters.type === 'income' 
                ? <FiTrendingUp className="h-4 w-4 text-green-500" />
                : localFilters.type === 'expense'
                ? <FiTrendingDown className="h-4 w-4 text-red-500" />
                : <FiTag className="h-4 w-4 text-gray-400 dark:text-gray-500" />
              }
            />

            <SelectField
              id="transaction-category"
              label="Category"
              value={localFilters.category_ids?.[0] || ''}
              onChange={handleCategoryChange}
              options={categoryOptions}
              icon={<FiTag className="h-4 w-4 text-gray-400 dark:text-gray-500" />}
            />
          </div>

          {/* Date Range Filters */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Date Range
              </h4>
              {(localFilters.date_from || localFilters.date_to) && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={clearDateFilters}
                  icon={<FiX />}
                  className="text-xs"
                >
                  Clear Dates
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  From Date
                </label>
                <DateInput
                  id="date-from"
                  value={formatDateForInput(localFilters.date_from)}
                  onChange={handleDateFromChange}
                  placeholder="Select start date"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  To Date
                </label>
                <DateInput
                  id="date-to"
                  value={formatDateForInput(localFilters.date_to)}
                  onChange={handleDateToChange}
                  placeholder="Select end date"
                />
              </div>
            </div>
          </div>

          {/* Quick Date Filters */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Quick Filters
            </h4>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  const today = new Date();
                  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                  handleDateRangeChange(startOfMonth, today);
                }}
              >
                Bulan ini
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  const today = new Date();
                  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                  const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
                  handleDateRangeChange(lastMonth, endOfLastMonth);
                }}
              >
                Bulan lalu
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  const today = new Date();
                  const last30Days = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
                  handleDateRangeChange(last30Days, today);
                }}
              >
                30 Hari kepungkur
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  const today = new Date();
                  const startOfYear = new Date(today.getFullYear(), 0, 1);
                  handleDateRangeChange(startOfYear, today);
                }}
              >
                Tahun ini
              </Button>
            </div>
          </div>
        </div>

        {/* Active Filters Summary */}
        {hasActiveFilters() && (
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Active Filters:
              </h4>
              <Button
                variant="secondary"
                size="sm"
                onClick={clearAllFilters}
                icon={<FiX />}
              >
                Clear All
              </Button>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {filters.type && filters.type !== 'all' && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                  Type: {filters.type === 'income' ? 'Income' : 'Expense'}
                </span>
              )}
              {filters.category_ids && filters.category_ids.length > 0 && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                  Category: {categories.find(c => c.id === filters.category_ids?.[0])?.name || 'Selected'}
                </span>
              )}
              {filters.date_from && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200">
                  From: {filters.date_from.toLocaleDateString('id-ID')}
                </span>
              )}
              {filters.date_to && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200">
                  To: {filters.date_to.toLocaleDateString('id-ID')}
                </span>
              )}
              {filters.search_term && filters.search_term.trim() !== '' && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200">
                  Search: "{filters.search_term}"
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}