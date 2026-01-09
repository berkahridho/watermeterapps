import { unparse } from 'papaparse';
import { jsPDF } from 'jspdf';

export type ExportFormat = 'csv' | 'pdf';

export interface ExportOptions {
  filename?: string;
  title?: string;
}

export function exportData<T extends Record<string, any>>(
  data: T[],
  format: ExportFormat,
  options: ExportOptions = {}
): void {
  const { filename = 'export', title = 'Export' } = options;
  
  if (format === 'csv') {
    exportToCSV(data, `${filename}.csv`);
  } else if (format === 'pdf') {
    exportToPDF(data, `${filename}.pdf`, title);
  }
}

function exportToCSV<T extends Record<string, any>>(
  data: T[],
  filename: string = 'export.csv'
): void {
  const csv = unparse(data);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function exportToPDF<T extends Record<string, any>>(
  data: T[],
  filename: string = 'export.pdf',
  title: string = 'Export'
): void {
  const doc = new jsPDF();
  doc.text(title, 10, 10);
  
  // Add table headers
  let yPosition = 20;
  const headers = Object.keys(data[0] || {});
  doc.setFontSize(12);
  doc.text(headers.join('    '), 10, yPosition);
  yPosition += 10;
  
  // Add data rows
  data.forEach((row, index) => {
    if (yPosition > 280) { // Start new page if needed
      doc.addPage();
      yPosition = 20;
    }
    
    const values = headers.map(header => row[header] || '');
    doc.text(values.join('    '), 10, yPosition);
    yPosition += 10;
  });
  
  doc.save(filename);
}