import { jsPDF } from 'jspdf';
import { unparse } from 'papaparse';
import { FinancialReport, Transaction } from '../types/financial';
import { formatDateID } from './dateFormat';

/**
 * Format currency amount to Indonesian Rupiah format
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Generate filename with timestamp
 */
function generateFilename(prefix: string, extension: string): string {
  const now = new Date();
  const timestamp = now.toISOString().slice(0, 19).replace(/[:-]/g, '').replace('T', '_');
  return `${prefix}_${timestamp}.${extension}`;
}

/**
 * Export financial report to PDF with Indonesian formatting
 */
export function exportFinancialReportToPDF(report: FinancialReport): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const margin = 20;
  let yPosition = margin;

  // Title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Laporan Keuangan', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 15;

  // Period
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  const periodText = `Periode: ${formatDateID(report.period.start_date)} - ${formatDateID(report.period.end_date)}`;
  doc.text(periodText, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 20;

  // Summary Section
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Ringkasan Keuangan', margin, yPosition);
  yPosition += 10;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Total Pemasukan: ${formatCurrency(report.summary.total_income)}`, margin, yPosition);
  yPosition += 8;
  doc.text(`Total Pengeluaran: ${formatCurrency(report.summary.total_expenses)}`, margin, yPosition);
  yPosition += 8;
  
  // Net profit with color coding
  const netProfitText = `Laba Bersih: ${formatCurrency(report.summary.net_profit)}`;
  if (report.summary.net_profit >= 0) {
    doc.setTextColor(0, 128, 0); // Green for profit
  } else {
    doc.setTextColor(255, 0, 0); // Red for loss
  }
  doc.setFont('helvetica', 'bold');
  doc.text(netProfitText, margin, yPosition);
  doc.setTextColor(0, 0, 0); // Reset to black
  doc.setFont('helvetica', 'normal');
  yPosition += 20;

  // Income by Category
  if (report.income_by_category.length > 0) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Pemasukan per Kategori', margin, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    report.income_by_category.forEach(category => {
      if (yPosition > 270) {
        doc.addPage();
        yPosition = margin;
      }
      const categoryText = `${category.category.name}: ${formatCurrency(category.total_amount)} (${category.transaction_count} transaksi)`;
      doc.text(categoryText, margin, yPosition);
      yPosition += 7;
    });
    yPosition += 10;
  }

  // Expenses by Category
  if (report.expenses_by_category.length > 0) {
    if (yPosition > 250) {
      doc.addPage();
      yPosition = margin;
    }
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Pengeluaran per Kategori', margin, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    report.expenses_by_category.forEach(category => {
      if (yPosition > 270) {
        doc.addPage();
        yPosition = margin;
      }
      const categoryText = `${category.category.name}: ${formatCurrency(category.total_amount)} (${category.transaction_count} transaksi)`;
      doc.text(categoryText, margin, yPosition);
      yPosition += 7;
    });
    yPosition += 10;
  }

  // Transaction Details
  if (report.transactions.length > 0) {
    if (yPosition > 200) {
      doc.addPage();
      yPosition = margin;
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Detail Transaksi', margin, yPosition);
    yPosition += 10;

    // Table headers
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Tanggal', margin, yPosition);
    doc.text('Jenis', margin + 25, yPosition);
    doc.text('Kategori', margin + 45, yPosition);
    doc.text('Deskripsi', margin + 80, yPosition);
    doc.text('Jumlah', margin + 140, yPosition);
    yPosition += 8;

    // Table data
    doc.setFont('helvetica', 'normal');
    report.transactions.forEach(transaction => {
      if (yPosition > 270) {
        doc.addPage();
        yPosition = margin;
        // Repeat headers on new page
        doc.setFont('helvetica', 'bold');
        doc.text('Tanggal', margin, yPosition);
        doc.text('Jenis', margin + 25, yPosition);
        doc.text('Kategori', margin + 45, yPosition);
        doc.text('Deskripsi', margin + 80, yPosition);
        doc.text('Jumlah', margin + 140, yPosition);
        yPosition += 8;
        doc.setFont('helvetica', 'normal');
      }

      doc.text(formatDateID(transaction.date), margin, yPosition);
      doc.text(transaction.type === 'income' ? 'Masuk' : 'Keluar', margin + 25, yPosition);
      doc.text(transaction.category.name.substring(0, 15), margin + 45, yPosition);
      doc.text(transaction.description.substring(0, 25), margin + 80, yPosition);
      doc.text(formatCurrency(transaction.amount), margin + 140, yPosition);
      yPosition += 7;
    });
  }

  // Footer
  const footerY = doc.internal.pageSize.height - 15;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text(`Dibuat pada: ${formatDateID(report.generated_at)}`, margin, footerY);

  // Save the PDF
  const filename = generateFilename('laporan_keuangan', 'pdf');
  doc.save(filename);
}

/**
 * Export financial report to CSV with Indonesian formatting
 */
export function exportFinancialReportToCSV(report: FinancialReport): void {
  // Prepare data for CSV export
  const csvData = report.transactions.map(transaction => ({
    'Tanggal': formatDateID(transaction.date),
    'Jenis': transaction.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
    'Kategori': transaction.category.name,
    'Deskripsi': transaction.description,
    'Jumlah': transaction.amount,
    'Jumlah (Formatted)': formatCurrency(transaction.amount),
    'Dibuat Pada': formatDateID(transaction.created_at),
    'Dibuat Oleh': transaction.created_by,
  }));

  // Add summary rows at the beginning
  const summaryData = [
    {
      'Tanggal': `Periode: ${formatDateID(report.period.start_date)} - ${formatDateID(report.period.end_date)}`,
      'Jenis': '',
      'Kategori': '',
      'Deskripsi': '',
      'Jumlah': '',
      'Jumlah (Formatted)': '',
      'Dibuat Pada': '',
      'Dibuat Oleh': '',
    },
    {
      'Tanggal': 'RINGKASAN',
      'Jenis': '',
      'Kategori': '',
      'Deskripsi': '',
      'Jumlah': '',
      'Jumlah (Formatted)': '',
      'Dibuat Pada': '',
      'Dibuat Oleh': '',
    },
    {
      'Tanggal': 'Total Pemasukan',
      'Jenis': '',
      'Kategori': '',
      'Deskripsi': '',
      'Jumlah': report.summary.total_income,
      'Jumlah (Formatted)': formatCurrency(report.summary.total_income),
      'Dibuat Pada': '',
      'Dibuat Oleh': '',
    },
    {
      'Tanggal': 'Total Pengeluaran',
      'Jenis': '',
      'Kategori': '',
      'Deskripsi': '',
      'Jumlah': report.summary.total_expenses,
      'Jumlah (Formatted)': formatCurrency(report.summary.total_expenses),
      'Dibuat Pada': '',
      'Dibuat Oleh': '',
    },
    {
      'Tanggal': 'Laba Bersih',
      'Jenis': '',
      'Kategori': '',
      'Deskripsi': '',
      'Jumlah': report.summary.net_profit,
      'Jumlah (Formatted)': formatCurrency(report.summary.net_profit),
      'Dibuat Pada': '',
      'Dibuat Oleh': '',
    },
    {
      'Tanggal': '',
      'Jenis': '',
      'Kategori': '',
      'Deskripsi': '',
      'Jumlah': '',
      'Jumlah (Formatted)': '',
      'Dibuat Pada': '',
      'Dibuat Oleh': '',
    },
    {
      'Tanggal': 'DETAIL TRANSAKSI',
      'Jenis': '',
      'Kategori': '',
      'Deskripsi': '',
      'Jumlah': '',
      'Jumlah (Formatted)': '',
      'Dibuat Pada': '',
      'Dibuat Oleh': '',
    },
  ];

  const allData = [...summaryData, ...csvData];

  // Convert to CSV
  const csv = unparse(allData, {
    header: true,
    delimiter: ',',
  });

  // Create and download the file
  const BOM = '\uFEFF'; // UTF-8 BOM for proper encoding in Excel
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', generateFilename('laporan_keuangan', 'csv'));
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export transactions list to PDF
 */
export function exportTransactionsToPDF(transactions: Transaction[], title: string = 'Daftar Transaksi'): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const margin = 20;
  let yPosition = margin;

  // Title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(title, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 20;

  if (transactions.length === 0) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Tidak ada transaksi untuk ditampilkan', pageWidth / 2, yPosition, { align: 'center' });
  } else {
    // Table headers
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Tanggal', margin, yPosition);
    doc.text('Jenis', margin + 25, yPosition);
    doc.text('Kategori', margin + 45, yPosition);
    doc.text('Deskripsi', margin + 80, yPosition);
    doc.text('Jumlah', margin + 140, yPosition);
    yPosition += 10;

    // Table data
    doc.setFont('helvetica', 'normal');
    transactions.forEach(transaction => {
      if (yPosition > 270) {
        doc.addPage();
        yPosition = margin;
        // Repeat headers on new page
        doc.setFont('helvetica', 'bold');
        doc.text('Tanggal', margin, yPosition);
        doc.text('Jenis', margin + 25, yPosition);
        doc.text('Kategori', margin + 45, yPosition);
        doc.text('Deskripsi', margin + 80, yPosition);
        doc.text('Jumlah', margin + 140, yPosition);
        yPosition += 10;
        doc.setFont('helvetica', 'normal');
      }

      doc.text(formatDateID(transaction.date), margin, yPosition);
      doc.text(transaction.type === 'income' ? 'Masuk' : 'Keluar', margin + 25, yPosition);
      doc.text(transaction.category.name.substring(0, 15), margin + 45, yPosition);
      doc.text(transaction.description.substring(0, 25), margin + 80, yPosition);
      doc.text(formatCurrency(transaction.amount), margin + 140, yPosition);
      yPosition += 8;
    });
  }

  // Footer
  const footerY = doc.internal.pageSize.height - 15;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text(`Dibuat pada: ${formatDateID(new Date())}`, margin, footerY);

  // Save the PDF
  const filename = generateFilename('daftar_transaksi', 'pdf');
  doc.save(filename);
}

/**
 * Export transactions list to CSV
 */
export function exportTransactionsToCSV(transactions: Transaction[], title: string = 'Daftar Transaksi'): void {
  const csvData = transactions.map(transaction => ({
    'Tanggal': formatDateID(transaction.date),
    'Jenis': transaction.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
    'Kategori': transaction.category.name,
    'Deskripsi': transaction.description,
    'Jumlah': transaction.amount,
    'Jumlah (Formatted)': formatCurrency(transaction.amount),
    'Dibuat Pada': formatDateID(transaction.created_at),
    'Dibuat Oleh': transaction.created_by,
  }));

  // Convert to CSV
  const csv = unparse(csvData, {
    header: true,
    delimiter: ',',
  });

  // Create and download the file
  const BOM = '\uFEFF'; // UTF-8 BOM for proper encoding in Excel
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', generateFilename('daftar_transaksi', 'csv'));
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}