import { exportData } from './export';

export function exportToPDF(data: any[], filename: string = 'water_meter_readings.pdf') {
  // Extract filename without extension for use with the generic export function
  const nameWithoutExtension = filename.replace(/\.[^/.]+$/, '');
  exportData(data, 'pdf', { 
    filename: nameWithoutExtension,
    title: 'Water Meter Readings Report' 
  });
}