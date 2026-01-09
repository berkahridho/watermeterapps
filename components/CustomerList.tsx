import { Customer } from '@/types/types';
import { FiEdit, FiTrash2 } from 'react-icons/fi';

interface CustomerListProps {
  customers: Customer[];
  onEdit?: (customer: Customer) => void;
  onDelete?: (id: string) => void;
}

export default function CustomerList({ customers, onEdit, onDelete }: CustomerListProps) {
  return (
    <div className="overflow-hidden shadow rounded-lg">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              ID
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Name
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Address
            </th>
            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {customers.map((customer) => (
            <tr key={customer.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {customer.id}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {customer.name}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {customer.rt || 'N/A'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button 
                  onClick={() => onEdit && onEdit(customer)}
                  className="text-blue-600 hover:text-blue-900 mr-4"
                >
                  <FiEdit />
                </button>
                <button 
                  onClick={() => onDelete && onDelete(customer.id)}
                  className="text-red-600 hover:text-red-900"
                >
                  <FiTrash2 />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}