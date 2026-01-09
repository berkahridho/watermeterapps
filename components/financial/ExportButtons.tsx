'use client';

import React from 'react';
import { FinancialReport, Transaction } from '../../types/financial';
import { 
  exportFinancialReportToPDF, 
  exportFinancialReportToCSV,
  exportTransactionsToPDF,
  exportTransactionsToCSV 
} from '../../utils/financialExport';

interface ExportButtonsProps {
  // For financial reports
  report?: FinancialReport;
  // For transaction lists
  transactions?: Transaction[];
  // Custom export handlers (optional, overrides default behavior)
  onExportPDF?: () => void;
  onExportCSV?: () => void;
  disabled?: boolean;
  loading?: boolean;
  // Export type
  exportType?: 'report' | 'transactions';
  title?: string;
}

const ExportButtons: React.FC<ExportButtonsProps> = ({
  report,
  transactions,
  onExportPDF,
  onExportCSV,
  disabled = false,
  loading = false,
  exportType = 'report',
  title
}) => {
  const handlePDFExport = () => {
    if (onExportPDF) {
      onExportPDF();
      return;
    }

    if (exportType === 'report' && report) {
      exportFinancialReportToPDF(report);
    } else if (exportType === 'transactions' && transactions) {
      exportTransactionsToPDF(transactions, title);
    }
  };

  const handleCSVExport = () => {
    if (onExportCSV) {
      onExportCSV();
      return;
    }

    if (exportType === 'report' && report) {
      exportFinancialReportToCSV(report);
    } else if (exportType === 'transactions' && transactions) {
      exportTransactionsToCSV(transactions, title);
    }
  };

  const canExport = (exportType === 'report' && report) || 
                   (exportType === 'transactions' && transactions) ||
                   (onExportPDF && onExportCSV);

  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <button
        onClick={handlePDFExport}
        disabled={disabled || loading || !canExport}
        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        {loading ? 'Mengekspor...' : 'Ekspor PDF'}
      </button>
      <button
        onClick={handleCSVExport}
        disabled={disabled || loading || !canExport}
        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        {loading ? 'Mengekspor...' : 'Ekspor CSV'}
      </button>
    </div>
  );
};

export default ExportButtons;