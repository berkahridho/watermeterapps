import { useState } from 'react';
import { FiAlertTriangle, FiX, FiCheck } from 'react-icons/fi';
import { Transaction, TransactionInput } from '@/types/financial';
import Button from '@/components/Button';

interface DuplicateWarningDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  duplicateTransactions: Transaction[];
  newTransaction: TransactionInput;
}

export default function DuplicateWarningDialog({
  isOpen,
  onClose,
  onConfirm,
  duplicateTransactions,
  newTransaction
}: DuplicateWarningDialogProps) {
  const [isConfirming, setIsConfirming] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      await onConfirm();
    } finally {
      setIsConfirming(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <FiAlertTriangle className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Peringatan Transaksi Duplikat
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Ditemukan transaksi serupa yang sudah ada
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* New Transaction */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
              Transaksi Baru yang Akan Ditambahkan:
            </h3>
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Jenis:</span>
                  <span className="ml-2 text-gray-900 dark:text-white">
                    {newTransaction.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Jumlah:</span>
                  <span className="ml-2 text-gray-900 dark:text-white font-semibold">
                    {formatCurrency(newTransaction.amount)}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Tanggal:</span>
                  <span className="ml-2 text-gray-900 dark:text-white">
                    {formatDate(newTransaction.date)}
                  </span>
                </div>
                <div className="md:col-span-2">
                  <span className="font-medium text-gray-700 dark:text-gray-300">Deskripsi:</span>
                  <span className="ml-2 text-gray-900 dark:text-white">
                    {newTransaction.description}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Existing Similar Transactions */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
              Transaksi Serupa yang Sudah Ada:
            </h3>
            <div className="space-y-3">
              {duplicateTransactions.map((transaction, index) => (
                <div
                  key={transaction.id}
                  className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">Jenis:</span>
                      <span className="ml-2 text-gray-900 dark:text-white">
                        {transaction.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">Jumlah:</span>
                      <span className="ml-2 text-gray-900 dark:text-white font-semibold">
                        {formatCurrency(transaction.amount)}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">Tanggal:</span>
                      <span className="ml-2 text-gray-900 dark:text-white">
                        {formatDate(transaction.date)}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">Kategori:</span>
                      <span className="ml-2 text-gray-900 dark:text-white">
                        {transaction.category.name}
                      </span>
                    </div>
                    <div className="md:col-span-2">
                      <span className="font-medium text-gray-700 dark:text-gray-300">Deskripsi:</span>
                      <span className="ml-2 text-gray-900 dark:text-white">
                        {transaction.description}
                      </span>
                    </div>
                    <div className="md:col-span-2 text-xs text-gray-500 dark:text-gray-400">
                      Dibuat: {formatDate(transaction.created_at)} oleh {transaction.created_by}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Warning Message */}
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <FiAlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-orange-700 dark:text-orange-300">
                <p className="font-medium mb-1">Perhatian!</p>
                <p>
                  Sistem mendeteksi bahwa transaksi yang akan Anda tambahkan memiliki kesamaan dengan transaksi yang sudah ada. 
                  Hal ini mungkin merupakan duplikasi data.
                </p>
                <p className="mt-2">
                  Silakan periksa kembali detail transaksi. Jika Anda yakin ini bukan duplikasi, 
                  Anda dapat melanjutkan dengan menekan tombol "Ya, Lanjutkan".
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isConfirming}
            variant="danger"
            className="flex-1"
          >
            <FiCheck className="h-4 w-4 mr-2" />
            {isConfirming ? 'Menyimpan...' : 'Ya, Lanjutkan'}
          </Button>
          <Button
            type="button"
            onClick={onClose}
            variant="secondary"
            disabled={isConfirming}
            className="flex-1"
          >
            <FiX className="h-4 w-4 mr-2" />
            Batal
          </Button>
        </div>
      </div>
    </div>
  );
}