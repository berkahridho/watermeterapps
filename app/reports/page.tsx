'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FiPrinter, FiDownload, FiCalendar, FiSearch, FiRefreshCw, FiDollarSign, FiDroplet, FiUser, FiFileText, FiPercent, FiSettings, FiTrash2 } from 'react-icons/fi';
import { formatDateID, formatMonthYearID } from '@/utils/dateFormat';
import { supabase } from '@/lib/supabase';
import { offlineStorage } from '@/lib/offlineStorage';
import { CustomerDiscount } from '@/types/types';
import MeterDataService from '@/lib/meterDataService';
import Navigation from '@/components/Navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import DiscountManager from '@/components/DiscountManager';

interface BillData {
  customer: {
    id: string;
    name: string;
    rt: string;
    phone: string;
  };
  previousReading: number;
  currentReading: number;
  usage: number;
  unitUsage: number; // 1-10 m³
  tensUsage: number; // 11+ m³
  unitPrice: number; // Price for 1-10 m³
  tensPrice: number; // Price for 11+ m³
  speedometerFee: number; // Fixed fee
  originalAmount: number; // Amount before discount
  discount?: CustomerDiscount; // Applied discount
  discountAmount: number; // Discount amount in IDR
  totalAmount: number; // Final amount after discount
  billMonth: string;
  billDate: string;
}

export default function BillingReports() {
  const [user, setUser] = useState<any>(null);
  const [bills, setBills] = useState<BillData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedRT, setSelectedRT] = useState<string>('');
  const [mounted, setMounted] = useState(false);
  const [showDiscountManager, setShowDiscountManager] = useState(false);
  const [selectedCustomerForDiscount, setSelectedCustomerForDiscount] = useState<string>('');
  const [customers, setCustomers] = useState<Array<{id: string; name: string; rt: string; phone: string}>>([]);
  const [forceRefresh, setForceRefresh] = useState(false);
  const router = useRouter();

  // Use centralized pricing from MeterDataService
  const pricing = MeterDataService.getPricing();

  useEffect(() => {
    setMounted(true);
    
    // Check if user is logged in
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
    } else {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      
      // Check if user has access to reports - only admin can access (not RT PIC or viewer)
      const hasReportsAccess = parsedUser?.email === 'admin@example.com' || 
                              parsedUser?.role === 'admin' || 
                              (parsedUser?.email && parsedUser.email.includes('admin')) || 
                              parsedUser?.isDemo === true;
      
      if (!hasReportsAccess) {
        // Redirect unauthorized users to dashboard
        router.push('/dashboard');
        return;
      }
    }

    // Add global clear cache function for debugging
    if (typeof window !== 'undefined') {
      (window as any).clearWaterMeterCache = () => {
        offlineStorage.clearAllCache();
        return 'Cache cleared successfully!';
      };
      
      (window as any).showCacheInfo = () => {
        const customers = offlineStorage.getCustomers();
        const readings = offlineStorage.getReadings();
        const discounts = offlineStorage.getDiscounts();
        return {
          customers: customers.length,
          readings: readings.length,
          discounts: discounts.length
        };
      };
    }
  }, [router]);

  useEffect(() => {
    if (mounted && user) {
      fetchBillingData();
    }
  }, [mounted, user, forceRefresh]);

  const handleClearCache = () => {
    if (confirm('Hapus semua data cache? Data akan dimuat ulang dari server.')) {
      offlineStorage.clearAllCache();
      setForceRefresh(!forceRefresh);
      fetchBillingData(true); // Bypass cache
    }
  };

  const handleForceRefresh = () => {
    setForceRefresh(!forceRefresh);
    fetchBillingData(true); // Bypass cache
  };

  const calculateBill = (usage: number, customerId: string, billDate: string) => {
    // Use centralized billing calculation
    const billing = MeterDataService.calculateBilling(customerId, usage, billDate);
    
    return {
      unitUsage: billing.unitUsage,
      tensUsage: billing.tensUsage,
      unitPrice: billing.unitPrice,
      tensPrice: billing.tensPrice,
      originalAmount: billing.baseAmount,
      discount: billing.discount,
      discountAmount: billing.discountAmount,
      totalAmount: billing.finalAmount
    };
  };

  const fetchBillingData = async (bypassCache: boolean = false) => {
    setLoading(true);
    
    try {
      let customers: Array<{
        id: string;
        name: string;
        rt: string;
        phone: string;
      }> = [];
      let readings: Array<{
        id: string;
        customer_id: string;
        reading: number;
        date: string;
      }> = [];
      
      // Always try to fetch fresh data from server first
      try {
        const { data: customersData, error: customersError } = await supabase
          .from('customers')
          .select('*');
        
        if (!customersError && customersData) {
          let filteredCustomersData = customersData;
          
          // Filter customers based on user role
          if (user?.role === 'rt_pic' && user?.assigned_rt) {
            filteredCustomersData = customersData.filter(customer => customer.rt === user.assigned_rt);
          }
          
          customers = filteredCustomersData.map(c => ({
            id: c.id.toString(),
            name: c.name,
            rt: c.rt || '',
            phone: c.phone || ''
          }));
          setCustomers(customers); // Store in state for DiscountManager
        }
      } catch (error) {
        console.error('❌ Error fetching customers from server:', error);
      }

      try {
        const { data: readingsData, error: readingsError } = await supabase
          .from('meter_readings')
          .select('*')
          .order('date', { ascending: false });
        
        if (!readingsError && readingsData) {
          readings = readingsData;
        } else {
          console.warn('⚠️ No readings from server or error:', readingsError);
        }
      } catch (error) {
        console.error('❌ Error fetching readings from server:', error);
      }

      // If no readings from server, use offline storage
      if (readings.length === 0 && typeof window !== 'undefined') {
        const offlineReadings = offlineStorage.getReadings();
        if (offlineReadings.length > 0) {
          readings = offlineReadings;
        }
      }

      // If no customers from server, use offline storage
      if (customers.length === 0 && typeof window !== 'undefined') {
        let offlineCustomers = offlineStorage.getCustomers();
        
        if (offlineCustomers.length > 0) {
          // Filter customers based on user role
          if (user?.role === 'rt_pic' && user?.assigned_rt) {
            offlineCustomers = offlineCustomers.filter(customer => customer.rt === user.assigned_rt);
          }
          
          customers = offlineCustomers.map(c => ({
            id: c.id,
            name: c.name,
            rt: c.rt || '',
            phone: c.phone || ''
          }));
          setCustomers(customers);
        }
      }

      // Process billing data only if we have real data
      const billsData: BillData[] = [];
      
      for (const customer of customers) {
        // Get readings for this customer - convert IDs to strings for comparison
        const customerId = customer.id.toString();
        const customerReadings = readings
          .filter(reading => reading.customer_id.toString() === customerId)
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); // Sort ascending (oldest first)
        
        if (customerReadings.length >= 2) {
          // Get the last two readings (most recent and one before)
          const currentReading = customerReadings[customerReadings.length - 1];
          const previousReading = customerReadings[customerReadings.length - 2];
          const usage = Math.max(0, currentReading.reading - previousReading.reading);
          
          const billCalculation = calculateBill(usage, customer.id, currentReading.date);
          
          // Extract month from the current reading date for proper filtering
          const readingDate = new Date(currentReading.date);
          const readingMonth = `${readingDate.getFullYear()}-${String(readingDate.getMonth() + 1).padStart(2, '0')}`;
          
          billsData.push({
            customer: {
              id: customer.id,
              name: customer.name,
              rt: customer.rt,
              phone: customer.phone,
            },
            previousReading: previousReading.reading,
            currentReading: currentReading.reading,
            usage,
            unitUsage: billCalculation.unitUsage,
            tensUsage: billCalculation.tensUsage,
            unitPrice: billCalculation.unitPrice,
            tensPrice: billCalculation.tensPrice,
            speedometerFee: pricing.SPEEDOMETER_FEE,
            originalAmount: billCalculation.originalAmount,
            discount: billCalculation.discount || undefined,
            discountAmount: billCalculation.discountAmount,
            totalAmount: billCalculation.totalAmount,
            billMonth: formatMonthYearID(readingMonth),
            billDate: currentReading.date, // Use actual reading date, not current date
          });
        } else {
        }
      }
      
      setBills(billsData);
    } catch (error) {
      console.error('❌ Error fetching billing data:', error);
      setBills([]);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getAvailableMonths = () => {
    const months = new Set<string>();
    
    // Add months from actual bill data (any RT with readings)
    bills.forEach(bill => {
      if (bill.billDate) {
        const billDate = new Date(bill.billDate);
        const monthYear = `${billDate.getFullYear()}-${String(billDate.getMonth() + 1).padStart(2, '0')}`;
        months.add(monthYear);
      }
    });
    
    // Also add months from raw readings data (even if bills aren't generated yet)
    if (typeof window !== 'undefined') {
      const offlineReadings = offlineStorage.getReadings();
      offlineReadings.forEach(reading => {
        const readingDate = new Date(reading.date);
        const monthYear = `${readingDate.getFullYear()}-${String(readingDate.getMonth() + 1).padStart(2, '0')}`;
        months.add(monthYear);
      });
    }
    
    // If still no data, add current and previous months as fallback
    if (months.size === 0) {
      const currentDate = new Date();
      for (let i = 0; i < 6; i++) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        months.add(monthYear);
      }
    }
    
    return Array.from(months).sort((a, b) => b.localeCompare(a));
  };

  const getAvailableRTs = () => {
    const rts = new Set<string>();
    bills.forEach(bill => {
      if (bill.customer.rt) {
        rts.add(bill.customer.rt);
      }
    });
    
    // Also add RTs from customers even if they don't have bills yet
    if (typeof window !== 'undefined') {
      let offlineCustomers = offlineStorage.getCustomers();
      
      // Filter customers based on user role
      if (user?.role === 'rt_pic' && user?.assigned_rt) {
        offlineCustomers = offlineCustomers.filter(customer => customer.rt === user.assigned_rt);
      }
      
      offlineCustomers.forEach(customer => {
        if (customer.rt) {
          rts.add(customer.rt);
        }
      });
    }
    
    return Array.from(rts).sort();
  };

  const getRTDataStatus = (month: string) => {
    const rtStatus = new Map<string, { billCount: number; customerCount: number }>();
    
    // Initialize all known RTs
    ['RT 001', 'RT 002', 'RT 003', 'RT 004', 'RT 005'].forEach(rt => {
      rtStatus.set(rt, { billCount: 0, customerCount: 0 });
    });
    
    // Count bills per RT for the selected month
    bills.forEach(bill => {
      const billDate = new Date(bill.billDate);
      const billMonth = `${billDate.getFullYear()}-${String(billDate.getMonth() + 1).padStart(2, '0')}`;
      
      if (billMonth === month && bill.customer.rt) {
        const current = rtStatus.get(bill.customer.rt) || { billCount: 0, customerCount: 0 };
        rtStatus.set(bill.customer.rt, { 
          billCount: current.billCount + 1, 
          customerCount: current.customerCount + 1 
        });
      }
    });
    
    return rtStatus;
  };

  const filteredBills = bills.filter(bill =>
    bill.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bill.customer.rt?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bill.customer.phone?.includes(searchTerm)
  ).filter(bill => {
    if (selectedRT) {
      return bill.customer.rt === selectedRT;
    }
    return true;
  }).filter(bill => {
    if (selectedMonth) {
      // Extract YYYY-MM from bill date more robustly
      const billDate = new Date(bill.billDate);
      const billMonth = `${billDate.getFullYear()}-${String(billDate.getMonth() + 1).padStart(2, '0')}`;
      return billMonth === selectedMonth;
    }
    return true;
  });

  const generateReceiptHTML = (billsToprint: BillData[]) => {
    // Calculate RT totals for the summary
    const rtTotals = new Map<string, { customerCount: number; totalAmount: number; customers: string[] }>();
    
    billsToprint.forEach(bill => {
      const rt = bill.customer.rt || 'Unknown RT';
      if (!rtTotals.has(rt)) {
        rtTotals.set(rt, { customerCount: 0, totalAmount: 0, customers: [] });
      }
      const rtData = rtTotals.get(rt)!;
      rtData.customerCount++;
      rtData.totalAmount += bill.totalAmount;
      rtData.customers.push(bill.customer.name);
    });

    let html = `
      <html>
        <head>
          <title>Struk Air - ${formatDateID(new Date().toISOString())}</title>
          <style>
            @page {
              size: 21cm 33cm;
              margin: 3mm;
            }
            body {
              font-family: 'Helvetica', 'Arial', sans-serif;
              font-size: 11px;
              font-weight: bold;
              line-height: 1.2;
              margin: 0;
              padding: 0;
              color: #000;
              overflow-x: hidden;
              background: white;
            }
            .page {
              width: 100%;
              max-width: 100%;
              display: flex;
              flex-direction: column;
              page-break-after: always;
              box-sizing: border-box;
              padding: 0;
              margin: 0;
            }
            .receipt-container {
              width: calc(100% - 6mm);
              max-width: calc(100% - 6mm);
              display: flex;
              border: 2px solid #000;
              margin: 0 3mm 2mm 3mm;
              height: 68mm;
              page-break-inside: avoid;
              flex-shrink: 0;
              box-sizing: border-box;
            }
            .stub {
              width: 35%;
              border-right: 2px dashed #000;
              padding: 5px;
              background: #f8f8f8;
              font-size: 10px;
              font-weight: bold;
              box-sizing: border-box;
              overflow: hidden;
            }
            .stub .detail-label {
              flex: 0 0 100px;
            }
            .main-receipt {
              width: 65%;
              padding: 5px;
              background: white;
              font-size: 10px;
              font-weight: bold;
              box-sizing: border-box;
              overflow: hidden;
            }
            .header {
              text-align: center;
              margin-bottom: 6px;
              font-weight: bold;
            }
            .title {
              font-size: 14px;
              font-weight: bold;
              margin-bottom: 2px;
            }
            .subtitle {
              font-size: 12px;
              margin-bottom: 2px;
              font-weight: bold;
            }
            .period {
              font-size: 11px;
              margin-bottom: 4px;
              font-weight: bold;
            }
            .row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 1px;
              align-items: flex-start;
            }
            .row-label {
              flex: 1;
              text-align: left;
              font-size: 12px;
            }
            .row-value {
              text-align: right;
              min-width: 60px;
              font-size: 12px;
            }
            .detail-line {
              margin-bottom: 4px;
              font-size: 11px;
              font-weight: bold;
              line-height: 1.3;
              display: flex;
              align-items: baseline;
            }
            .detail-label {
              flex: 0 0 120px;
              text-align: left;
              font-weight: bold;
            }
            .detail-colon {
              flex: 0 0 8px;
              text-align: center;
              font-weight: bold;
            }
            .detail-value {
              flex: 1;
              display: flex;
              justify-content: space-between;
              align-items: baseline;
              margin-left: 5px;
              font-weight: bold;
            }
            .calculation-inline {
              font-size: 10px;
              font-weight: medium;
              color: #2c2c2cff;
            }
            .usage-inline {
              text-align: right;
              font-size: 11px;
              margin-right: 8px;
              
            }
            .calculation-detail {
              text-align: right;
              font-size: 10px;
              margin-top: 1px;
              margin-right: 12px;
            }
            .bold {
              font-weight: bold;
            }
            .meter-section {
              background: #f0f8ff;
              padding: 2px;
              margin: 2px 0;
              border-radius: 2px;
            }
            .usage-highlight {
              // background: #e6f3ff;
              padding: 1px;
              margin: 1px 0;
              border-radius: 1px;
              font-weight: bold;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              font-weight: bold;
              font-size: 13px;
              margin-top: 3px;
              padding: 3px;
              border: 2px solid #000;
              background: #f0f0f0;
            }
            .total-row span:last-child {
              margin-right: 12px;
            }
            .footer {
              margin-top: 4px;
              text-align: center;
              font-size: 12px;
            }
            .discount-section {
              margin-top: 2px;
              padding: 2px;
              border: 1px dashed #006600;
              background: #f0fff0;
              color: #006600;
              font-size: 11px;
            }
            .customer-name {
              font-weight: bold;
              font-size: 12px;
            }
            .important-value {
              font-weight: bold;
              font-size: 12px;
            }
            .rt-summary {
              width: calc(100% - 6mm);
              margin: 2mm 3mm 0 3mm;
              padding: 4mm;
              border: 2px solid #000;
              background: #f9f9f9;
              font-size: 11px;
              box-sizing: border-box;
              page-break-inside: avoid;
            }
            .rt-summary-title {
              text-align: center;
              font-size: 14px;
              font-weight: bold;
              margin-bottom: 4mm;
              text-transform: uppercase;
              line-height: 1.2;
            }
            .rt-summary-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 4mm;
              font-size: 11px;
            }
            .rt-summary-table th,
            .rt-summary-table td {
              border: 1px solid #000;
              padding: 2mm;
              text-align: left;
              vertical-align: middle;
            }
            .rt-summary-table th {
              background: #e0e0e0;
              font-weight: bold;
              text-align: center;
              font-size: 10px;
            }
            .rt-summary-table .amount {
              text-align: right;
              font-weight: bold;
              min-width: 80mm;
            }
            .rt-summary-footer {
              margin-top: 3mm;
              text-align: center;
              font-size: 10px;
              font-style: italic;
              line-height: 1.3;
            }
            @media print {
              body { 
                margin: 0; 
                overflow: hidden;
              }
              .page { 
                height: auto; 
                max-width: 100%;
                overflow: hidden;
              }
              .receipt-container { 
                max-width: none; 
                width: calc(100% - 4mm);
                page-break-inside: avoid;
                overflow: hidden;
              }
              .stub, .main-receipt {
                overflow: hidden;
              }
            }
          </style>
        </head>
        <body>
    `;

    // Group receipts - 4 per page
    for (let i = 0; i < billsToprint.length; i += 4) {
      const pageReceipts = billsToprint.slice(i, i + 4);
      const isLastPage = i + 4 >= billsToprint.length;
      
      html += '<div class="page">';
      
      pageReceipts.forEach((bill) => {
        html += `
          <div class="receipt-container">
            <!-- STUB SECTION (30%) -->
            <div class="stub">
              <div class="header">
                <div class="title">Struk PBR ${bill.billMonth.toUpperCase()}</div>
              </div>
              
              <div class="detail-line">
                <span class="detail-label">Nama</span>
                <span class="detail-colon">:</span>
                <span class="detail-value">${bill.customer.name}</span>
              </div>
              
              <div class="detail-line">
                <span class="detail-label">Meter lalu</span>
                <span class="detail-colon">:</span>
                <span class="detail-value">${bill.previousReading}</span>
                
              </div>
              
              <div class="detail-line">
                <span class="detail-label">Meter sekarang</span>
                <span class="detail-colon">:</span>
                <span class="detail-value">${bill.currentReading}</span>
              </div>
              
              <div class="detail-line">
                <span class="detail-label">Pemakaian</span>
                <span class="detail-colon">:</span>
                <span class="detail-value"><strong>${bill.usage} m³</strong></span>
              </div>
              
              <div class="detail-line">
                <span class="detail-label">Harga satuan m³</span>
                <span class="detail-colon">:</span>
                <span class="detail-value">
                  <span>Rp ${bill.unitPrice.toLocaleString('id-ID')}</span>
                  <span class="calculation-inline">${bill.unitUsage} x Rp 1.500</span>
                </span>
              </div>
              
              ${bill.tensUsage > 0 ? `
              <div class="detail-line">
                <span class="detail-label">Harga puluhan m³</span>
                <span class="detail-colon">:</span>
                <span class="detail-value">
                  <span>Rp ${bill.tensPrice.toLocaleString('id-ID')}</span>
                  <span class="calculation-inline">${bill.tensUsage} x Rp 2.000</span>
                </span>
              </div>
              ` : ''}
              
              <div class="detail-line">
                <span class="detail-label">Beban</span>
                <span class="detail-colon">:</span>
                <span class="detail-value">Rp ${bill.speedometerFee.toLocaleString('id-ID')}</span>
              </div>
              
              ${bill.discount ? `
              <div class="detail-line discount-section">
                <span class="detail-label">Diskon</span>
                <span class="detail-colon">:</span>
                <span class="detail-value"><strong>-Rp ${bill.discountAmount.toLocaleString('id-ID')}</strong></span>
              </div>
              
              ` : ''}
              
              <div class="total-row">
                <span><strong>TOTAL</strong></span>
                <span><strong>:</strong></span>
                <span><strong>Rp ${bill.totalAmount.toLocaleString('id-ID')}</strong></span>
              </div>
              
              <div class="footer">
                ${formatDateID(bill.billDate)}
              </div>
            </div>
            
            <!-- MAIN RECEIPT SECTION (70%) -->
            <div class="main-receipt">
              <div class="header">
                <div class="title">PAM SWADAYA BERKAH RIDHO KALIPUCANG</div>
                <div class="subtitle">STRUK PEMBAYARAN TAGIHAN AIR - PERIODE ${bill.billMonth.toUpperCase()} - RT ${bill.customer.rt}</div>
              </div>
              
              <div class="detail-line">
                <span class="detail-label">Nama</span>
                <span class="detail-colon">:</span>
                <span class="detail-value">${bill.customer.name}</span>
              </div>
              
              <div class="detail-line">
                <span class="detail-label">Meter lalu</span>
                <span class="detail-colon">:</span>
                <span class="detail-value">${bill.previousReading}</span>
                
              </div>
              
              <div class="detail-line">
                <span class="detail-label">Meter sekarang</span>
                <span class="detail-colon">:</span>
                <span class="detail-value">${bill.currentReading}</span>
                <span class="usage-inline">Pemakaian</span>
                <span style="usage-inline">:</span>
                <span class="detail-value"><strong>${bill.usage} m³</strong></span>
              </div>
                                          
              <div class="detail-line">
                <span class="detail-label">Harga satuan m³</span>
                <span class="detail-colon">:</span>
                <span class="detail-value">
                  <span>Rp ${bill.unitPrice.toLocaleString('id-ID')}</span>
                  <span class="calculation-inline">${bill.unitUsage} x Rp 1.500</span>
                </span>
              </div>
              
              ${bill.tensUsage > 0 ? `
              <div class="detail-line">
                <span class="detail-label">Harga puluhan m³</span>
                <span class="detail-colon">:</span>
                <span class="detail-value">
                  <span>Rp ${bill.tensPrice.toLocaleString('id-ID')}</span>
                  <span class="calculation-inline">${bill.tensUsage} x Rp 2.000</span>
                </span>
              </div>
              ` : ''}
              
              <div class="detail-line">
                <span class="detail-label">Beban speedometer</span>
                <span class="detail-colon">:</span>
                <span class="detail-value">Rp ${bill.speedometerFee.toLocaleString('id-ID')}</span>
              </div>
              
              ${bill.discount ? `
              <div class="detail-line discount-section">
                <span class="detail-label">Subtotal</span>
                <span class="detail-colon">:</span>
                <span class="detail-value">Rp ${bill.originalAmount.toLocaleString('id-ID')}</span>
              </div>
              <div class="detail-line discount-section">
                <span class="detail-label">Diskon (${bill.discount.discount_percentage > 0 ? bill.discount.discount_percentage + '%' : 'Rp ' + (bill.discount.discount_amount || 0).toLocaleString('id-ID')})</span>
                <span class="detail-colon">:</span>
                <span class="detail-value"><strong>-Rp ${bill.discountAmount.toLocaleString('id-ID')}</strong></span>
                <div style="font-size: 10px; font-style: italic; text-align: center; margin: 8px 0; padding: 4px; background: #f0fff0; border-radius: 12px;">
                Alasan: ${bill.discount.reason}
              </div>
              </div>
              
              ` : ''}
              
              <div class="total-row">
                <span><strong>TOTAL BAYAR</strong></span>
                <span><strong>:</strong></span>
                <span><strong>Rp ${bill.totalAmount.toLocaleString('id-ID')}</strong></span>
              </div>
              
              <div class="footer">
                <div style="display: flex; justify-content: space-between; font-weight: bold;">
                  <span>TERIMA KASIH</span>
                  <span>Kalipucang, ${formatDateID(bill.billDate)}</span>
                </div>
              </div>
            </div>
          </div>
        `;
      });
      
      // Add RT Summary at the end of the last page
      if (isLastPage && (billsToprint.length > 4 || rtTotals.size > 1)) {
        html += `
        <div class="rt-summary">
          <div class="rt-summary-title">
            RINGKASAN TOTAL TAGIHAN PER RT<br>
            PERIODE ${billsToprint[0]?.billMonth?.toUpperCase() || formatMonthYearID(new Date().toISOString().substring(0, 7))}
          </div>
          
          <table class="rt-summary-table">
            <thead>
              <tr>
                <th>RT</th>
                <th>Jumlah Pelanggan</th>
                <th>Total Tagihan</th>
              </tr>
            </thead>
            <tbody>
        `;
        
        // Sort RTs for consistent display
        const sortedRTs = Array.from(rtTotals.entries()).sort((a, b) => a[0].localeCompare(b[0]));
        let grandTotal = 0;
        let totalCustomers = 0;
        
        sortedRTs.forEach(([rt, data]) => {
          grandTotal += data.totalAmount;
          totalCustomers += data.customerCount;
          
          html += `
          <tr>
            <td><strong>${rt}</strong></td>
            <td style="text-align: center;">${data.customerCount}</td>
            <td class="amount">Rp ${data.totalAmount.toLocaleString('id-ID')}</td>
          </tr>
          `;
        });
        
        // Add total row
        html += `
            <tr style="background: #d0d0d0; font-weight: bold;">
              <td><strong>TOTAL KESELURUHAN</strong></td>
              <td style="text-align: center;"><strong>${totalCustomers}</strong></td>
              <td class="amount"><strong>Rp ${grandTotal.toLocaleString('id-ID')}</strong></td>
            </tr>
          </tbody>
        </table>
        
        <div class="rt-summary-footer">
          <p><strong>CATATAN UNTUK PETUGAS PENAGIH:</strong></p>
          <p>• Total di atas adalah jumlah yang harus dikumpulkan dari setiap RT</p>
          <p>• Pastikan semua pelanggan sudah membayar sebelum menyetor ke admin</p>
          <p style="margin-top: 2mm;">Dicetak: ${formatDateID(new Date().toISOString())}</p>
        </div>
        </div>
        `;
      }
      
      html += '</div>'; // Close page
    }
      
    html += '</body></html>';
    return html;
  };

  const printReceipts = (billsToPrint: BillData[]) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(generateReceiptHTML(billsToPrint));
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
  };

  const printAllReceipts = () => {
    printReceipts(filteredBills);
  };

  const printSingleReceipt = (bill: BillData) => {
    printReceipts([bill]);
  };

  if (!user) {
    return null;
  }

  return (
    <ProtectedRoute requireAuth={true}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navigation user={user} currentPage="reports" />
        
        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Laporan Tagihan Air</h1>
                <p className="text-gray-600 dark:text-gray-400">Generate dan cetak kwitansi pembayaran air</p>
              </div>
              {/* Only show discount management for admin and RT PIC */}
              {(user?.role === 'admin' || user?.role === 'rt_pic' || user?.email === 'admin@example.com' || user?.isDemo === true) && (
                <button
                  onClick={() => setShowDiscountManager(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium hover:from-purple-600 hover:to-pink-600 transition-all duration-300"
                >
                  <FiPercent className="h-4 w-4" />
                  <span>Kelola Diskon</span>
                </button>
              )}
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                  <FiUser className="h-5 w-5" />
                </div>
                <div className="ml-4">
                  <h3 className="text-xs font-medium text-gray-600 dark:text-gray-400">Total Pelanggan</h3>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">{bills.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600 text-white">
                  <FiDroplet className="h-5 w-5" />
                </div>
                <div className="ml-4">
                  <h3 className="text-xs font-medium text-gray-600 dark:text-gray-400">Total Pemakaian</h3>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {bills.reduce((sum, bill) => sum + bill.usage, 0).toFixed(0)} m³
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <div className="p-3 rounded-xl bg-gradient-to-br from-green-500 to-green-600 text-white">
                  <FiDollarSign className="h-5 w-5" />
                </div>
                <div className="ml-4">
                  <h3 className="text-xs font-medium text-gray-600 dark:text-gray-400">Total Tagihan</h3>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(bills.reduce((sum, bill) => sum + bill.totalAmount, 0))}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                  <FiFileText className="h-5 w-5" />
                </div>
                <div className="ml-4">
                  <h3 className="text-xs font-medium text-gray-600 dark:text-gray-400">Rata-rata Tagihan</h3>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {bills.length ? formatCurrency(bills.reduce((sum, bill) => sum + bill.totalAmount, 0) / bills.length) : formatCurrency(0)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Filters and Actions */}
          <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div className="relative md:col-span-2">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiSearch className="text-gray-400 dark:text-gray-500" />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Cari pelanggan..."
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white dark:bg-gray-700 dark:text-white pl-10 text-sm"
                />
              </div>
              
              <div className="relative">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white dark:bg-gray-700 dark:text-white text-sm"
                >
                  <option value="">Semua Bulan</option>
                  {getAvailableMonths().map(month => (
                    <option key={month} value={month}>
                      {formatMonthYearID(month)}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="relative">
                <select
                  value={selectedRT}
                  onChange={(e) => setSelectedRT(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white dark:bg-gray-700 dark:text-white text-sm"
                >
                  <option value="">Semua RT</option>
                  {getAvailableRTs().map(rt => (
                    <option key={rt} value={rt}>
                      {rt}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={() => fetchBillingData()}
                className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600 transition-all duration-300 text-sm"
              >
                <FiRefreshCw className="mr-1" /> Refresh
              </button>

              <button 
                onClick={handleForceRefresh}
                className="bg-blue-100 dark:bg-blue-700 text-blue-800 dark:text-blue-200 px-4 py-2 rounded-xl font-medium hover:bg-blue-200 dark:hover:bg-blue-600 border border-blue-200 dark:border-blue-600 transition-all duration-300 text-sm"
              >
                <FiRefreshCw className="mr-1" /> Force Refresh
              </button>

              <button 
                onClick={handleClearCache}
                className="bg-red-100 dark:bg-red-700 text-red-800 dark:text-red-200 px-4 py-2 rounded-xl font-medium hover:bg-red-200 dark:hover:bg-red-600 border border-red-200 dark:border-red-600 transition-all duration-300 text-sm"
              >
                <FiTrash2 className="mr-1" /> Clear Cache
              </button>
              
              <button 
                onClick={printAllReceipts}
                disabled={filteredBills.length === 0}
                className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-4 py-2 rounded-xl font-medium hover:from-blue-600 hover:to-cyan-600 transition-all duration-300 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiPrinter className="mr-1" /> Cetak Semua Kwitansi ({filteredBills.length})
              </button>
            </div>
          </div>

          {/* Bills Table */}
          {loading ? (
            <div className="bg-white dark:bg-gray-800 p-12 text-center rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex justify-center">
                <FiRefreshCw className="animate-spin h-6 w-6 text-blue-500" />
              </div>
              <p className="mt-3 text-gray-600 dark:text-gray-400">Memuat data tagihan...</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Pelanggan
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Pemakaian
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Tarif
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Diskon
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Total Bayar
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredBills.map((bill) => (
                      <tr key={bill.customer.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {bill.customer.name}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {bill.customer.rt} • {bill.customer.phone}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-white">
                            <div>{bill.previousReading} → {bill.currentReading} m³</div>
                            <div className="text-blue-600 dark:text-blue-400 font-medium">
                              {bill.usage} m³ digunakan
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          <div>
                            {bill.unitUsage > 0 && (
                              <div>Satuan: {bill.unitUsage} × {formatCurrency(pricing.UNIT_RATE)}</div>
                            )}
                            {bill.tensUsage > 0 && (
                              <div>Puluhan: {bill.tensUsage} × {formatCurrency(pricing.TENS_RATE)}</div>
                            )}
                            <div>Speedometer: {formatCurrency(pricing.SPEEDOMETER_FEE)}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {bill.discount ? (
                            <div className="text-sm">
                              <div className="text-green-600 dark:text-green-400 font-medium">
                                {bill.discount.discount_percentage > 0 
                                  ? `${bill.discount.discount_percentage}%` 
                                  : formatCurrency(bill.discount.discount_amount || 0)
                                }
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {bill.discount.reason}
                              </div>
                              <div className="text-xs text-green-600 dark:text-green-400">
                                -{formatCurrency(bill.discountAmount)}
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2">
                              <span className="text-gray-400 dark:text-gray-500 text-sm">Tidak ada</span>
                              {/* Only show discount settings for admin and RT PIC */}
                              {(user?.role === 'admin' || user?.role === 'rt_pic' || user?.email === 'admin@example.com' || user?.isDemo === true) && (
                                <button
                                  onClick={() => {
                                    setSelectedCustomerForDiscount(bill.customer.id);
                                    setShowDiscountManager(true);
                                  }}
                                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                                  title="Tambah diskon"
                                >
                                  <FiSettings className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm">
                            {bill.discountAmount > 0 && (
                              <div className="text-gray-500 dark:text-gray-400 line-through">
                                {formatCurrency(bill.originalAmount)}
                              </div>
                            )}
                            <span className="text-lg font-bold text-green-600 dark:text-green-400">
                              {formatCurrency(bill.totalAmount)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => printSingleReceipt(bill)}
                            className="bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/70 transition-colors"
                          >
                            <FiPrinter className="mr-1" /> Cetak
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {filteredBills.length === 0 && (
                <div className="text-center py-12">
                  <FiFileText className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Tidak ada tagihan</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Belum ada data tagihan yang tersedia.
                  </p>
                </div>
              )}
            </div>
          )}
        </main>
        
        {/* Discount Manager Modal */}
        {showDiscountManager && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <DiscountManager
                customers={customers}
                selectedCustomerId={selectedCustomerForDiscount}
                onDiscountSet={(discount) => {
                  // Refresh billing data to show updated discounts
                  fetchBillingData();
                  setShowDiscountManager(false);
                  setSelectedCustomerForDiscount('');
                }}
                onClose={() => {
                  setShowDiscountManager(false);
                  setSelectedCustomerForDiscount('');
                }}
              />
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}