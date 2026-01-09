import { exportData } from './export';

export function exportToCSV(data: any[], filename: string = 'water_meter_readings.csv') {
  // Extract filename without extension for use with the generic export function
  const nameWithoutExtension = filename.replace(/\.[^/.]+$/, '');
  exportData(data, 'csv', { filename: nameWithoutExtension });
}