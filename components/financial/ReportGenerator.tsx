'use client';

import React, { useState, useEffect } from 'react';
import { DateRange, FinancialReport } from '@/types/financial';
import { FinancialService } from '@/lib/financialService';
import ReportSummary from './ReportSummary';
import ExportButtons from './ExportButtons';

interface ReportGeneratorProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  onExport: (format: 'pdf' | 'csv') => Promise<void>;
}

const ReportGenerator: React.FC<ReportGeneratorProps> = ({
  dateRange,
  onDateRangeChange,
  onExport
}) => {
  const [report, setReport] = useState<FinancialReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [startDate, setStartDate] = useState(
    dateRange.start_date.toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(
    dateRange.end_date.toISOString().split('T')[0]
  );

  const financialService = new FinancialService();

  // Generate report when date range changes
  useEffect(() => {
    generateReport();
  }, [dateRange]);

  const generateReport = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const generatedReport = await financialService.generateReport(dateRange);
      setReport(generatedReport);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate report');
      console.error('Error generating report:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDateRangeUpdate = () => {
    const newStartDate = new Date(startDate);
    const newEndDate = new Date(endDate);
    
    // Validate date range
    if (newStartDate > newEndDate) {
      setError('Start date cannot be after end date');
      return;
    }
    
    if (newEndDate > new Date()) {
      setError('End date cannot be in the future');
      return;
    }
    
    setError(null);
    onDateRangeChange({
      start_date: newStartDate,
      end_date: newEndDate
    });
  };

  const handleExportPDF = async () => {
    if (!report) return;
    
    setExporting(true);
    try {
      // The ExportButtons component will handle the actual export
      // using the new financial export services
      await onExport('pdf');
    } catch (err) {
      setError('Failed to export PDF');
      console.error('Error exporting PDF:', err);
    } finally {
      setExporting(false);
    }
  };

  const handleExportCSV = async () => {
    if (!report) return;
    
    setExporting(true);
    try {
      // The ExportButtons component will handle the actual export
      // using the new financial export services
      await onExport('csv');
    } catch (err) {
      setError('Failed to export CSV');
      console.error('Error exporting CSV:', err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
        Laporan Keuangan
      </h2>

      {/* Date Range Selection */}
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Periode Laporan
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tanggal Mulai
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tanggal Akhir
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleDateRangeUpdate}
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Memuat...' : 'Buat Laporan'}
            </button>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="mb-6 text-center">
          <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-sm shadow rounded-md text-blue-500 bg-blue-100 dark:bg-blue-900/20">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Membuat laporan...
          </div>
        </div>
      )}

      {/* Report Display */}
      {report && !loading && (
        <>
          <ReportSummary report={report} />
          
          {/* Export Buttons */}
          <div className="mt-6">
            <ExportButtons
              report={report}
              exportType="report"
              onExportPDF={handleExportPDF}
              onExportCSV={handleExportCSV}
              loading={exporting}
              disabled={!report}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default ReportGenerator;