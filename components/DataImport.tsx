'use client';

import { useState } from 'react';
import { FiUpload, FiDownload, FiCheckCircle, FiAlertTriangle, FiFileText, FiDollarSign, FiActivity } from 'react-icons/fi';
import { supabase } from '@/lib/supabase';

interface ImportResult {
  success: boolean;
  message: string;
  details?: {
    transactionsImported?: number;
    readingsImported?: number;
    errors?: string[];
  };
}

export default function DataImport() {
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [activeTab, setActiveTab] = useState<'transactions' | 'readings'>('transactions');

  const downloadTemplate = async (type: 'transactions' | 'readings') => {
    if (type === 'transactions') {
      // Keep existing transaction template with dummy data
      const template = {
        filename: 'transactions_template.csv',
        headers: ['type', 'amount', 'date', 'category_name', 'description', 'created_by'],
        sample: [
          ['income', '150000', '2024-12-15', 'Pemasukan RT 1', 'Payment from RT 01 - December 2024', 'admin'],
          ['expense', '50000', '2024-12-14', 'Pulsa Listrik Cangkring', 'Electricity bill for pump station', 'admin'],
          ['income', '200000', '2025-01-13', 'Pemasukan RT 2', 'Payment from RT 02 - December 2024', 'admin'],
          ['expense', '75000', '2024-12-12', 'Perawatan/Service', 'Monthly pump maintenance', 'admin'],
          ['income', '500000', '2024-12-11', 'Saldo Awal', 'Initial balance from previous year', 'admin'],
          ['income', '75000', '2025-01-10', 'Lainnya', 'Late payment RT 03 - December 2024', 'admin']
        ]
      };

      const csvContent = [
        template.headers.join(','),
        ...template.sample.map(row => row.join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', template.filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (type === 'readings') {
      // Generate meter readings template with actual customer data
      try {
        const { data: customers, error } = await supabase
          .from('customers')
          .select('name, rt, phone')
          .order('rt, name');

        if (error) throw error;

        const headers = ['customer_name', 'rt', 'reading', 'date'];
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format

        let csvRows = [];
        
        if (customers && customers.length > 0) {
          // Use actual customer data
          csvRows = customers.map(customer => [
            customer.name,
            customer.rt || '',
            '', // Empty reading for user to fill
            dateStr // Today's date as default
          ]);
        } else {
          // Fallback to dummy data if no customers found
          csvRows = [
            ['Budi Santoso', 'RT 01', '', dateStr],
            ['Siti Aminah', 'RT 01', '', dateStr],
            ['Ahmad Rahman', 'RT 02', '', dateStr],
            ['Dewi Sartika', 'RT 02', '', dateStr]
          ];
        }

        const csvContent = [
          headers.join(','),
          ...csvRows.map(row => row.map(cell => 
            // Escape cells that contain commas or quotes
            typeof cell === 'string' && (cell.includes(',') || cell.includes('"')) 
              ? `"${cell.replace(/"/g, '""')}"` 
              : cell
          ).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `meter_readings_template_${dateStr}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Show success message
        setResult({
          success: true,
          message: `Template berhasil diunduh dengan ${customers?.length || 0} customer. Isi kolom 'reading' dan sesuaikan tanggal jika diperlukan.`
        });

      } catch (error: any) {
        console.error('Error generating meter readings template:', error);
        setResult({
          success: false,
          message: `Error generating template: ${error.message}`
        });
      }
    }
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>, type: 'transactions' | 'readings') => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setResult(null);

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim());
      const rows = lines.slice(1).map(line => line.split(',').map(cell => cell.trim()));

      if (type === 'transactions') {
        await importTransactions(headers, rows);
      } else if (type === 'readings') {
        await importMeterReadings(headers, rows);
      }
    } catch (error: any) {
      setResult({
        success: false,
        message: `Error importing ${type}: ${error.message}`
      });
    } finally {
      setImporting(false);
    }
  };

  const importTransactions = async (headers: string[], rows: string[][]) => {
    const typeIndex = headers.indexOf('type');
    const amountIndex = headers.indexOf('amount');
    const dateIndex = headers.indexOf('date');
    const categoryNameIndex = headers.indexOf('category_name');
    const descriptionIndex = headers.indexOf('description');
    const createdByIndex = headers.indexOf('created_by');

    if (typeIndex === -1 || amountIndex === -1 || dateIndex === -1 || categoryNameIndex === -1) {
      throw new Error('CSV must have columns: type, amount, date, category_name');
    }

    // First, get all transaction categories to match names
    const { data: categories, error: categoryError } = await supabase
      .from('transaction_categories')
      .select('id, name, type');

    if (categoryError) throw categoryError;

    // Create category mapping
    const categoryMap = new Map();
    const categoryList: string[] = [];
    
    categories?.forEach(category => {
      const normalizedName = category.name.toUpperCase().trim();
      categoryList.push(`${category.name} (${category.type})`);
      
      // Create exact match key
      const exactKey = `${normalizedName}|${category.type.toUpperCase()}`;
      categoryMap.set(exactKey, {
        id: category.id,
        originalName: category.name,
        originalType: category.type
      });
    });

    const transactions = [];
    const errors: string[] = [];
    const matchLog: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 2; // +2 because CSV has header row and we start from 0
      
      try {
        const csvType = row[typeIndex]?.trim().toLowerCase() || '';
        const csvAmount = row[amountIndex]?.trim() || '';
        const csvDate = row[dateIndex]?.trim() || '';
        const csvCategoryName = row[categoryNameIndex]?.trim() || '';
        const csvDescription = row[descriptionIndex]?.trim() || '';
        const csvCreatedBy = row[createdByIndex]?.trim() || 'system';
        
        if (!csvType || !csvAmount || !csvDate || !csvCategoryName) {
          errors.push(`Row ${rowNumber}: Missing required data - Type: "${csvType}", Amount: "${csvAmount}", Date: "${csvDate}", Category: "${csvCategoryName}"`);
          continue;
        }

        // Validate transaction type
        if (!['income', 'expense'].includes(csvType)) {
          errors.push(`Row ${rowNumber}: Invalid transaction type "${csvType}". Must be "income" or "expense"`);
          continue;
        }
        
        const normalizedCategoryName = csvCategoryName.toUpperCase().trim();
        const normalizedType = csvType.toUpperCase().trim();
        
        // Try to match category
        let matchedCategory = null;
        const exactKey = `${normalizedCategoryName}|${normalizedType}`;
        
        if (categoryMap.has(exactKey)) {
          matchedCategory = categoryMap.get(exactKey);
          matchLog.push(`Row ${rowNumber}: "${csvCategoryName}" (${csvType}) → "${matchedCategory.originalName}" (${matchedCategory.originalType}) [exact match]`);
        } else {
          errors.push(`Row ${rowNumber}: Category not found - "${csvCategoryName}" for type "${csvType}". Available categories: ${categoryList.slice(0, 3).join(', ')}...`);
          continue;
        }
        
        // Parse date
        let date = csvDate;
        if (date.includes('/')) {
          const parts = date.split('/');
          if (parts.length === 3) {
            // Handle DD/MM/YYYY format
            const day = parts[0].padStart(2, '0');
            const month = parts[1].padStart(2, '0');
            const year = parts[2];
            date = `${year}-${month}-${day}`;
          }
        }

        const amount = parseFloat(csvAmount);
        if (isNaN(amount) || amount <= 0) {
          errors.push(`Row ${rowNumber}: Invalid amount value "${csvAmount}" - must be a positive number`);
          continue;
        }

        transactions.push({
          type: csvType,
          amount: amount,
          date: date,
          category_id: matchedCategory.id,
          description: csvDescription || `${csvType} transaction`,
          created_by: csvCreatedBy,
          csvCategoryName: csvCategoryName,
          matchedCategoryName: matchedCategory.originalName
        });
      } catch (error: any) {
        errors.push(`Row ${rowNumber}: Error processing - ${error.message}`);
      }
    }

    // Show matching preview before importing
    if (transactions.length > 0 && matchLog.length > 0) {
      const preview = matchLog.slice(0, 5).join('\n');
      const confirmMessage = `Found ${transactions.length} transactions to import. First 5 matches:\n\n${preview}\n\n${matchLog.length > 5 ? `...and ${matchLog.length - 5} more matches.\n\n` : ''}Do you want to proceed with the import?`;
      
      if (!window.confirm(confirmMessage)) {
        setResult({
          success: false,
          message: 'Import cancelled by user',
          details: { errors: ['Import was cancelled'] }
        });
        return;
      }
    }

    let imported = 0;
    const importErrors: string[] = [];

    for (const transaction of transactions) {
      try {
        const { error } = await supabase
          .from('financial_transactions')
          .insert({
            type: transaction.type,
            amount: transaction.amount,
            date: transaction.date,
            category_id: transaction.category_id,
            description: transaction.description,
            created_by: transaction.created_by
          });

        if (error) {
          importErrors.push(`Database error for transaction ${transaction.description}: ${error.message}`);
        } else {
          imported++;
        }
      } catch (error: any) {
        importErrors.push(`Import error for transaction ${transaction.description}: ${error.message}`);
      }
    }

    const allErrors = [...errors, ...importErrors];
    
    setResult({
      success: imported > 0,
      message: `Import completed: ${imported} transactions imported${allErrors.length > 0 ? `, ${allErrors.length} errors` : ''}`,
      details: {
        transactionsImported: imported,
        errors: allErrors.slice(0, 15) // Show more errors for debugging
      }
    });
  };

  const importMeterReadings = async (headers: string[], rows: string[][]) => {
    const customerNameIndex = headers.indexOf('customer_name');
    const rtIndex = headers.indexOf('rt');
    const phoneIndex = headers.indexOf('phone'); // Optional now
    const readingIndex = headers.indexOf('reading');
    const dateIndex = headers.indexOf('date');

    if (customerNameIndex === -1 || rtIndex === -1 || readingIndex === -1 || dateIndex === -1) {
      throw new Error('CSV must have columns: customer_name, rt, reading, date');
    }

    // Get all customers for matching
    const { data: customers, error: customerError } = await supabase
      .from('customers')
      .select('id, name, rt, phone');

    if (customerError) throw customerError;

    // Helper function to normalize RT format
    const normalizeRT = (rt: string): string => {
      if (!rt) return '';
      
      // Remove extra spaces and convert to uppercase
      const cleaned = rt.trim().toUpperCase();
      
      // Handle various RT formats
      const rtMatch = cleaned.match(/RT\s*(\d+)/);
      if (rtMatch) {
        const number = rtMatch[1];
        // Standardize to "RT 01", "RT 02" format (2 digits with leading zero)
        return `RT ${number.padStart(2, '0')}`;
      }
      
      // If no RT prefix, assume it's just a number
      const numberMatch = cleaned.match(/^(\d+)$/);
      if (numberMatch) {
        return `RT ${numberMatch[1].padStart(2, '0')}`;
      }
      
      return cleaned; // Return as-is if no pattern matches
    };

    // Helper function for fuzzy name matching
    const calculateSimilarity = (str1: string, str2: string): number => {
      const s1 = str1.toLowerCase().trim();
      const s2 = str2.toLowerCase().trim();
      
      // Exact match
      if (s1 === s2) return 1.0;
      
      // Check if one contains the other
      if (s1.includes(s2) || s2.includes(s1)) return 0.8;
      
      // Simple word-based similarity
      const words1 = s1.split(/\s+/);
      const words2 = s2.split(/\s+/);
      
      let matchingWords = 0;
      for (const word1 of words1) {
        for (const word2 of words2) {
          if (word1 === word2 || word1.includes(word2) || word2.includes(word1)) {
            matchingWords++;
            break;
          }
        }
      }
      
      return matchingWords / Math.max(words1.length, words2.length);
    };

    // Create customer mapping with improved matching
    const customerMap = new Map();
    const customerList: string[] = [];
    
    customers?.forEach(customer => {
      const normalizedRT = normalizeRT(customer.rt || '');
      customerList.push(`${customer.name} (${normalizedRT}) - ${customer.phone || 'No phone'}`);
      
      const normalizedName = customer.name.toUpperCase().trim();
      const normalizedPhone = customer.phone ? customer.phone.replace(/\D/g, '') : '';
      
      // Create multiple matching keys for flexibility
      const keys = [
        `${normalizedName}|${normalizedRT}|${normalizedPhone}`, // Primary: name + RT + phone
        `${normalizedName}|${normalizedRT}`, // Secondary: name + RT
        `${normalizedRT}|${normalizedPhone}`, // Tertiary: RT + phone (for similar names)
      ];
      
      keys.forEach(key => {
        if (key && !customerMap.has(key)) {
          customerMap.set(key, {
            ...customer,
            normalizedRT,
            matchType: key === keys[0] ? 'exact' : key === keys[1] ? 'name_rt' : 'rt_phone'
          });
        }
      });
    });

    const readings = [];
    const errors: string[] = [];
    const matchLog: string[] = [];
    const warnings: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 2; // +2 because CSV has header row and we start from 0
      
      try {
        const csvName = row[customerNameIndex]?.trim() || '';
        const csvRT = row[rtIndex]?.trim() || '';
        const csvPhone = phoneIndex !== -1 ? row[phoneIndex]?.trim() || '' : '';
        const csvReading = row[readingIndex]?.trim() || '';
        const csvDate = row[dateIndex]?.trim() || '';
        
        if (!csvName || !csvRT || !csvReading || !csvDate) {
          errors.push(`Row ${rowNumber}: Missing required data - Name: "${csvName}", RT: "${csvRT}", Reading: "${csvReading}", Date: "${csvDate}"`);
          continue;
        }
        
        const normalizedName = csvName.toUpperCase().trim();
        const normalizedRT = normalizeRT(csvRT);
        const normalizedPhone = csvPhone ? csvPhone.replace(/\D/g, '') : '';
        
        // Try to match customer with multiple strategies
        let matchedCustomer = null;
        let matchType = '';
        
        // Strategy 1: Exact match (name + RT + phone)
        if (normalizedPhone) {
          const exactKey = `${normalizedName}|${normalizedRT}|${normalizedPhone}`;
          if (customerMap.has(exactKey)) {
            matchedCustomer = customerMap.get(exactKey);
            matchType = 'exact match with phone';
          }
        }
        
        // Strategy 2: Name + RT match
        if (!matchedCustomer) {
          const nameRTKey = `${normalizedName}|${normalizedRT}`;
          if (customerMap.has(nameRTKey)) {
            matchedCustomer = customerMap.get(nameRTKey);
            matchType = 'name + RT match';
          }
        }
        
        // Strategy 3: RT + phone match (for cases where name might be slightly different)
        if (!matchedCustomer && normalizedPhone) {
          const rtPhoneKey = `${normalizedRT}|${normalizedPhone}`;
          if (customerMap.has(rtPhoneKey)) {
            matchedCustomer = customerMap.get(rtPhoneKey);
            matchType = 'RT + phone match';
            warnings.push(`Row ${rowNumber}: Name mismatch - CSV: "${csvName}", DB: "${matchedCustomer.name}" (matched by RT + phone)`);
          }
        }
        
        // Strategy 4: Fuzzy name matching within same RT
        if (!matchedCustomer) {
          let bestMatch = null;
          let bestSimilarity = 0;
          
          for (const customer of customers || []) {
            const customerNormalizedRT = normalizeRT(customer.rt || '');
            if (customerNormalizedRT === normalizedRT) {
              const similarity = calculateSimilarity(csvName, customer.name);
              if (similarity > bestSimilarity && similarity >= 0.7) { // 70% similarity threshold
                bestSimilarity = similarity;
                bestMatch = {
                  ...customer,
                  normalizedRT: customerNormalizedRT,
                  similarity
                };
              }
            }
          }
          
          if (bestMatch) {
            matchedCustomer = bestMatch;
            matchType = `fuzzy match (${Math.round(bestMatch.similarity * 100)}% similar)`;
            warnings.push(`Row ${rowNumber}: Fuzzy name match - CSV: "${csvName}", DB: "${bestMatch.name}" (${Math.round(bestMatch.similarity * 100)}% similar)`);
          }
        }
        
        if (!matchedCustomer) {
          // Show available customers in the same RT for better error messages
          const sameRTCustomers = customers?.filter(c => normalizeRT(c.rt || '') === normalizedRT) || [];
          const sameRTList = sameRTCustomers.map(c => `"${c.name}"`).join(', ');
          
          errors.push(`Row ${rowNumber}: Customer not found - "${csvName}" in ${normalizedRT}. Available customers in ${normalizedRT}: ${sameRTList || 'None'}`);
          continue;
        }
        
        matchLog.push(`Row ${rowNumber}: "${csvName}" (${csvRT}) → "${matchedCustomer.name}" (${matchedCustomer.normalizedRT}) [${matchType}]`);
        
        // Parse reading
        const reading = parseInt(csvReading);
        if (isNaN(reading) || reading < 0) {
          errors.push(`Row ${rowNumber}: Invalid reading value "${csvReading}" - must be a non-negative integer`);
          continue;
        }

        // Parse date
        let date = csvDate;
        if (date.includes('/')) {
          const parts = date.split('/');
          if (parts.length === 3) {
            // Handle DD/MM/YYYY format
            const day = parts[0].padStart(2, '0');
            const month = parts[1].padStart(2, '0');
            const year = parts[2];
            date = `${year}-${month}-${day}`;
          }
        }

        // Check for existing reading in the same month
        const readingDate = new Date(date);
        const monthKey = `${readingDate.getFullYear()}-${(readingDate.getMonth() + 1).toString().padStart(2, '0')}`;
        
        const { data: existingReadings, error: checkError } = await supabase
          .from('meter_readings')
          .select('id, reading, date')
          .eq('customer_id', matchedCustomer.id)
          .gte('date', `${monthKey}-01`)
          .lt('date', `${readingDate.getFullYear()}-${(readingDate.getMonth() + 2).toString().padStart(2, '0')}-01`);

        if (checkError) {
          errors.push(`Row ${rowNumber}: Database error checking existing readings - ${checkError.message}`);
          continue;
        }

        if (existingReadings && existingReadings.length > 0) {
          errors.push(`Row ${rowNumber}: Reading already exists for ${matchedCustomer.name} in ${monthKey} (existing: ${existingReadings[0].reading})`);
          continue;
        }

        readings.push({
          customer_id: matchedCustomer.id,
          reading: reading,
          date: date,
          csvName: csvName,
          csvRT: csvRT,
          matchedName: matchedCustomer.name,
          matchedRT: matchedCustomer.normalizedRT,
          matchType: matchType
        });
      } catch (error: any) {
        errors.push(`Row ${rowNumber}: Error processing - ${error.message}`);
      }
    }

    // Show matching preview with warnings
    if (readings.length > 0 && matchLog.length > 0) {
      const preview = matchLog.slice(0, 5).join('\n');
      const warningText = warnings.length > 0 ? `\n\nWARNINGS:\n${warnings.slice(0, 3).join('\n')}${warnings.length > 3 ? `\n...and ${warnings.length - 3} more warnings` : ''}` : '';
      
      const confirmMessage = `Found ${readings.length} meter readings to import. First 5 matches:\n\n${preview}\n\n${matchLog.length > 5 ? `...and ${matchLog.length - 5} more matches.\n\n` : ''}${warningText}\n\nDo you want to proceed with the import?`;
      
      if (!window.confirm(confirmMessage)) {
        setResult({
          success: false,
          message: 'Import cancelled by user',
          details: { errors: ['Import was cancelled'] }
        });
        return;
      }
    }

    let imported = 0;
    const importErrors: string[] = [];

    for (const reading of readings) {
      try {
        const { error } = await supabase
          .from('meter_readings')
          .insert({
            customer_id: reading.customer_id,
            reading: reading.reading,
            date: reading.date
          });

        if (error) {
          importErrors.push(`Database error for ${reading.matchedName}: ${error.message}`);
        } else {
          imported++;
        }
      } catch (error: any) {
        importErrors.push(`Import error for ${reading.matchedName}: ${error.message}`);
      }
    }

    const allErrors = [...errors, ...importErrors];
    const allWarnings = warnings;
    
    setResult({
      success: imported > 0,
      message: `Import completed: ${imported} meter readings imported${allErrors.length > 0 ? `, ${allErrors.length} errors` : ''}${allWarnings.length > 0 ? `, ${allWarnings.length} warnings` : ''}`,
      details: {
        readingsImported: imported,
        errors: [...allErrors.slice(0, 10), ...allWarnings.slice(0, 5)]
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('transactions')}
            className={`flex-1 flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'transactions'
                ? 'bg-white dark:bg-gray-600 text-green-600 dark:text-green-400 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <FiDollarSign className="mr-2 h-4 w-4" />
            Import Transaksi Keuangan
          </button>
          <button
            onClick={() => setActiveTab('readings')}
            className={`flex-1 flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'readings'
                ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <FiActivity className="mr-2 h-4 w-4" />
            Import Pembacaan Meter
          </button>
        </div>
      </div>

      {/* Transaction Import Tab */}
      {activeTab === 'transactions' && (
        <>
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center mb-2">
              <FiDollarSign className="mr-2 text-green-500" />
              Import Data Transaksi Keuangan
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Import data transaksi pemasukan dan pengeluaran dari file Excel/CSV
            </p>
          </div>

          {/* Templates */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
              1. Download Template
            </h3>
            <div className="grid grid-cols-1 gap-4">
              <button
                onClick={() => downloadTemplate('transactions')}
                className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl hover:border-green-500 dark:hover:border-green-400 transition-colors"
              >
                <div className="text-center">
                  <FiDownload className="mx-auto h-8 w-8 text-gray-400 dark:text-gray-500 mb-2" />
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Template Transaksi Keuangan</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">transactions_template.csv</p>
                </div>
              </button>
            </div>
          </div>

          {/* Import */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
              2. Upload File CSV
            </h3>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Import Transaksi Keuangan
                </label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => handleFileImport(e, 'transactions')}
                  disabled={importing}
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all bg-white dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            {importing && (
              <div className="mt-4 flex items-center justify-center py-4">
                <FiUpload className="animate-spin h-5 w-5 text-green-500 mr-2" />
                <span className="text-green-600 dark:text-green-400">Mengimport data transaksi...</span>
              </div>
            )}
          </div>

          {/* Debug - Show Available Categories */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
              3. Debug - Check Available Categories
            </h3>
            <button
              onClick={async () => {
                try {
                  const { data: categories, error } = await supabase
                    .from('transaction_categories')
                    .select('id, name, type, is_active')
                    .eq('is_active', true)
                    .order('type, name');
                  
                  if (error) throw error;
                  
                  const categoryList = categories?.map(c => `${c.name} (${c.type})`).join('\n') || 'No categories found';
                  alert(`Available transaction categories:\n\n${categoryList}`);
                } catch (error: any) {
                  alert(`Error loading categories: ${error.message}`);
                }
              }}
              className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600 transition-all duration-300"
            >
              Show Available Categories
            </button>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Click to see all transaction categories currently in the database with their types
            </p>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
            <div className="flex items-start">
              <FiFileText className="h-5 w-5 text-blue-500 dark:text-blue-400 mr-3 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Petunjuk Import Transaksi:</h4>
                <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                  <li>1. Download template CSV terlebih dahulu</li>
                  <li>2. Isi data sesuai format template</li>
                  <li>3. Simpan sebagai CSV (UTF-8 encoding)</li>
                  <li>4. Pastikan kategori transaksi sudah ada di sistem</li>
                  <li>5. Format tanggal: YYYY-MM-DD atau DD/MM/YYYY</li>
                  <li>6. Type: "income" untuk pemasukan, "expense" untuk pengeluaran</li>
                  <li>7. Amount: angka positif tanpa simbol mata uang</li>
                  <li>8. Category_name: harus persis sama dengan nama kategori di database</li>
                  <li>9. Gunakan tombol "Show Available Categories" untuk melihat kategori yang tersedia</li>
                </ul>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Meter Reading Import Tab */}
      {activeTab === 'readings' && (
        <>
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center mb-2">
              <FiActivity className="mr-2 text-blue-500" />
              Import Data Pembacaan Meter
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Import data pembacaan meter air dari file Excel/CSV
            </p>
          </div>

          {/* Templates */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
              1. Download Template
            </h3>
            <div className="grid grid-cols-1 gap-4">
              <button
                onClick={() => downloadTemplate('readings')}
                className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
              >
                <div className="text-center">
                  <FiDownload className="mx-auto h-8 w-8 text-gray-400 dark:text-gray-500 mb-2" />
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Template Pembacaan Meter</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Dengan data customer aktual - siap diisi</p>
                </div>
              </button>
            </div>
          </div>

          {/* Import */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
              2. Upload File CSV
            </h3>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Import Pembacaan Meter
                </label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => handleFileImport(e, 'readings')}
                  disabled={importing}
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            {importing && (
              <div className="mt-4 flex items-center justify-center py-4">
                <FiUpload className="animate-spin h-5 w-5 text-blue-500 mr-2" />
                <span className="text-blue-600 dark:text-blue-400">Mengimport data pembacaan meter...</span>
              </div>
            )}
          </div>

          {/* Debug - Show Available Customers */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
              3. Debug - Check Available Customers
            </h3>
            <button
              onClick={async () => {
                try {
                  const { data: customers, error } = await supabase
                    .from('customers')
                    .select('id, name, rt, phone')
                    .order('rt, name');
                  
                  if (error) throw error;
                  
                  const customerList = customers?.map(c => `${c.name} (${c.rt}) - ${c.phone}`).join('\n') || 'No customers found';
                  alert(`Available customers:\n\n${customerList}`);
                } catch (error: any) {
                  alert(`Error loading customers: ${error.message}`);
                }
              }}
              className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600 transition-all duration-300"
            >
              Show Available Customers
            </button>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Click to see all customers currently in the database with their RT and phone numbers
            </p>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
            <div className="flex items-start">
              <FiFileText className="h-5 w-5 text-blue-500 dark:text-blue-400 mr-3 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Petunjuk Import Pembacaan Meter (Smart Template):</h4>
                <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                  <li>1. <strong>Download Template Cerdas:</strong> Template berisi semua customer aktual dari database</li>
                  <li>2. <strong>Isi Reading:</strong> Tinggal isi kolom 'reading' dengan angka pembacaan meter</li>
                  <li>3. <strong>Sesuaikan Tanggal:</strong> Ubah tanggal jika diperlukan (default: hari ini)</li>
                  <li>4. Simpan sebagai CSV (UTF-8 encoding)</li>
                  <li>5. <strong>RT Format Fleksibel:</strong> "RT 01", "RT01", "1" semua diterima</li>
                  <li>6. <strong>Nama Fleksibel:</strong> Sistem dapat mencocokkan nama yang mirip (70%+ similarity)</li>
                  <li>7. <strong>Multiple Matching:</strong> Sistem mencoba nama+RT, RT+phone, dan fuzzy matching</li>
                  <li>8. <strong>Preview & Warnings:</strong> Lihat hasil matching sebelum import final</li>
                  <li>9. Sistem mencegah duplikasi pembacaan dalam bulan yang sama</li>
                  <li>10. Gunakan "Show Available Customers" untuk referensi jika diperlukan</li>
                </ul>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Results */}
      {result && (
        <div className={`p-4 rounded-xl ${
          result.success 
            ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
            : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
        }`}>
          <div className="flex items-start">
            {result.success ? (
              <FiCheckCircle className="h-5 w-5 text-green-500 dark:text-green-400 mr-3 mt-0.5" />
            ) : (
              <FiAlertTriangle className="h-5 w-5 text-red-500 dark:text-red-400 mr-3 mt-0.5" />
            )}
            <div className="flex-1">
              <p className={`font-medium ${
                result.success 
                  ? 'text-green-800 dark:text-green-200' 
                  : 'text-red-800 dark:text-red-200'
              }`}>
                {result.message}
              </p>
              
              {result.details && (
                <div className="mt-2 text-sm">
                  {result.details.transactionsImported && (
                    <p className="text-green-700 dark:text-green-300">
                      ✅ {result.details.transactionsImported} transaksi berhasil diimport
                    </p>
                  )}
                  {result.details.readingsImported && (
                    <p className="text-green-700 dark:text-green-300">
                      ✅ {result.details.readingsImported} pembacaan meter berhasil diimport
                    </p>
                  )}
                  {result.details.errors && result.details.errors.length > 0 && (
                    <div className="mt-2">
                      <p className="text-red-700 dark:text-red-300 font-medium">Errors:</p>
                      <ul className="list-disc list-inside text-red-600 dark:text-red-400">
                        {result.details.errors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}