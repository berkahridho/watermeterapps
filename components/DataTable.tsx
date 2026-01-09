import { ReactNode } from 'react';
import { FiRefreshCw, FiBarChart2 } from 'react-icons/fi';

interface TableColumn<T> {
  key: string;
  title: string;
  render?: (value: any, item: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
  rowClassName?: (item: T) => string;
}

export default function DataTable<T extends Record<string, any>>({
  columns,
  data,
  loading = false,
  emptyMessage = 'No data found',
  onRowClick,
  rowClassName
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 p-12 text-center rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex justify-center">
          <FiRefreshCw className="animate-spin h-6 w-6 text-blue-500" />
        </div>
        <p className="mt-3 text-gray-600 dark:text-gray-400">Loading data...</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 overflow-hidden rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              {columns.map((column) => (
                <th 
                  key={column.key} 
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider"
                >
                  {column.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {data.length > 0 ? (
              data.map((item, index) => (
                <tr 
                  key={index} 
                  className={`
                    hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-300 ease-out
                    ${onRowClick ? 'cursor-pointer' : ''}
                    ${rowClassName ? rowClassName(item) : ''}
                  `}
                  onClick={() => onRowClick && onRowClick(item)}
                >
                  {columns.map((column) => (
                    <td 
                      key={`${index}-${column.key}`} 
                      className={`
                        px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 
                        ${column.className || ''}
                      `}
                    >
                      {column.render 
                        ? column.render(item[column.key], item) 
                        : item[column.key] as ReactNode
                      }
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td 
                  colSpan={columns.length} 
                  className="px-4 py-12 text-center text-gray-500 dark:text-gray-400"
                >
                  <div className="flex flex-col items-center justify-center">
                    <FiBarChart2 className="h-10 w-10 text-gray-300 dark:text-gray-600 mb-2" />
                    <p>{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}