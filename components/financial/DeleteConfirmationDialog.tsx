import { Transaction } from '@/types/financial';
import { formatDateID } from '@/utils/dateFormat';
import { FiAlertTriangle, FiTrash2, FiX } from 'react-icons/fi';
import Button from '@/components/Button';

interface DeleteConfirmationDialogProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (id: string) => Promise<void>;
  loading?: boolean;
}

export default function DeleteConfirmationDialog({
  transaction,
  isOpen,
  onClose,
  onConfirm,
  loading = false
}: DeleteConfirmationDialogProps) {
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const handleConfirm = async () => {
    if (transaction) {
      try {
        await onConfirm(transaction.id);
        onClose();
      } catch (error) {
        console.error('Error deleting transaction:', error);
      }
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
          <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              {/* Warning Icon */}
              <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/20 sm:mx-0 sm:h-10 sm:w-10">
                <FiAlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>

              {/* Content */}
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left flex-1">
                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100">
                  Delete Transaction
                </h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    Are you sure you want to delete this transaction? This action cannot be undone.
                  </p>
                  
                  {/* Transaction Details */}
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Type:</span>
                        <span className={`text-sm font-semibold ${
                          transaction.type === 'income' 
                            ? 'text-green-600 dark:text-green-400' 
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                          {transaction.type === 'income' ? 'Income' : 'Expense'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Description:</span>
                        <span className="text-sm text-gray-900 dark:text-gray-100 text-right max-w-xs truncate">
                          {transaction.description}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Amount:</span>
                        <span className={`text-sm font-semibold ${
                          transaction.type === 'income' 
                            ? 'text-green-600 dark:text-green-400' 
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                          {formatCurrency(transaction.amount)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Category:</span>
                        <span className="text-sm text-gray-900 dark:text-gray-100">
                          {transaction.category.name}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Date:</span>
                        <span className="text-sm text-gray-900 dark:text-gray-100">
                          {formatDateID(transaction.date)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Close button */}
              <button
                onClick={onClose}
                disabled={loading}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
              >
                <FiX className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <Button
              variant="danger"
              loading={loading}
              icon={<FiTrash2 />}
              onClick={handleConfirm}
              className="w-full sm:w-auto sm:ml-3"
            >
              {loading ? 'Deleting...' : 'Delete Transaction'}
            </Button>
            <Button
              variant="secondary"
              onClick={onClose}
              disabled={loading}
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