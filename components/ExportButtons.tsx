import { FiDownload } from 'react-icons/fi';
import Button from './Button';
import { exportData, ExportFormat } from '@/utils/export';

interface ExportButtonsProps {
  data: any[];
  filenamePrefix?: string;
}

export default function ExportButtons({ data, filenamePrefix = 'report' }: ExportButtonsProps) {
  const handleExport = (format: ExportFormat) => {
    exportData(data, format, { 
      filename: `${filenamePrefix}.${format}`,
      title: `${filenamePrefix} Report`
    });
  };

  return (
    <div className="flex flex-wrap gap-3">
      <Button 
        onClick={() => handleExport('csv')}
        variant="success"
        icon={<FiDownload />}
      >
        Export CSV
      </Button>
      
      <Button 
        onClick={() => handleExport('pdf')}
        variant="primary"
        icon={<FiDownload />}
      >
        Export PDF
      </Button>
    </div>
  );
}