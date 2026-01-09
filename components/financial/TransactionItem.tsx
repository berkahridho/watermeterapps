import { Transaction } from '@/types/financial';
import { formatDateID } from '@/utils/dateFormat';
import { FiEdit, FiTrash2, FiTrendingUp, FiTrendingDown } from 'react-icons/fi';
import Button from '@/components/Button';

interface TransactionItemProps {
  transaction: Transaction;
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: string) => Promise<void>;
  loading?: boolean;
  variant?: 'table' | 'card';
}

export default function TransactionItem({
  transaction,
  onEdit,
  onDelete,
  loading = false,
  variant = 'table'
}: TransactionItemProps) {
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getTypeIcon = (type: 'income' | 'expense') => {
    return type === 'income' 
      ? <FiTrendingUp className="h-4 w-4 text-green-500" />
      : <FiTrendingDown className="h-4 w-4 text-red-500" />;
  };

  const getTypeColor = (type: 'income' | 'expense') => {
    return type === 'income' 
      ? 'text-green-600 dark:text-green-400'
      : 'text-red-600 dark:text-red-400';
  };

  const handleDelete = async () => {
    try {
      await onDelete(transaction.id);
    } catch (error) {
      console.error('Error deleting transaction:', error);
    }
  };

  if (variant === 'card') {
    return (
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow duration-200">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center mb-2">
              {getTypeIcon(transaction.type)}
              <span className={`ml-2 text-sm font-medium ${getTypeColor(transaction.type)}`}>
                {transaction.type === 'income' ? 'Income' : 'Expense'}
              </span>
            </div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {transaction.description}
            </h3>
            <div className="mt-1 flex items-center text-xs text-gray-500 dark:text-gray-400">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 mr-2">
                {transaction.category.name}
              </span>
              <span>{formatDateID(transaction.date)}</span>
            </div>
            <p className={`text-lg font-semibold mt-2 ${getTypeColor(transaction.type)}`}>
              {formatCurrency(transaction.amount)}
            </p>
          </div>
          <div className="flex items-center space-x-2 ml-4">
            <Button
              variant="secondary"
              size="sm"
              icon={<FiEdit />}
              onClick={() => onEdit(transaction)}
              className="!p-2"
            >
              <span className="sr-only">Edit</span>
            </Button>
            <Button
              variant="danger"
              size="sm"
              icon={<FiTrash2 />}
              onClick={handleDelete}
              loading={loading}
              className="!p-2"
            >
              <span className="sr-only">Delete</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Table row variant
  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          {getTypeIcon(transaction.type)}
          <span className={`ml-2 text-sm font-medium ${getTypeColor(transaction.type)}`}>
            {transaction.type === 'income' ? 'Income' : 'Expense'}
          </span>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {transaction.description}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
          {transaction.category.name}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className={`text-sm font-semibold ${getTypeColor(transaction.type)}`}>
          {formatCurrency(transaction.amount)}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
        {formatDateID(transaction.date)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <div className="flex items-center justify-end space-x-2">
          <Button
            variant="secondary"
            size="sm"
            icon={<FiEdit />}
            onClick={() => onEdit(transaction)}
          >
            Edit
          </Button>
          <Button
            variant="danger"
            size="sm"
            icon={<FiTrash2 />}
            onClick={handleDelete}
            loading={loading}
          >
            Delete
          </Button>
        </div>
      </td>
    </tr>
  );
}