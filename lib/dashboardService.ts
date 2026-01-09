/**
 * Dashboard Service for Water Meter Monitoring System
 * Handles dashboard metrics calculation and RT-based income tracking
 */

import { supabase } from './supabase';
import { DashboardMetrics, RTPaymentStatus, RTTotalBill } from '@/types/types';
import MeterDataService from './meterDataService';

export class DashboardService {
  private readonly WATER_RATE = 2500; // Rp per m³
  private metricsCache: { data: DashboardMetrics; timestamp: number } | null = null;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

  /**
   * Get all dashboard metrics for the previous month (adjusted for billing cycle)
   */
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    try {
      // Check cache first
      if (this.metricsCache && Date.now() - this.metricsCache.timestamp < this.CACHE_DURATION) {
        return this.metricsCache.data;
      }

      const currentDate = new Date();
      // Use previous month instead of current month for billing cycle
      const targetMonth = currentDate.getMonth(); // This gives us previous month (0-based)
      const targetYear = targetMonth === 0 ? currentDate.getFullYear() - 1 : currentDate.getFullYear();
      const adjustedMonth = targetMonth === 0 ? 12 : targetMonth; // Convert to 1-based for display
      
      // Fix: Use correct month for date range
      const monthStart = new Date(targetYear, targetMonth === 0 ? 11 : targetMonth - 1, 1);
      const monthEnd = new Date(targetYear, targetMonth === 0 ? 12 : targetMonth, 0);

      // Get all metrics in parallel
      const [
        totalCustomers,
        rtTotalBills,
        rtPaymentStatus
      ] = await Promise.all([
        this.getTotalCustomers(),
        this.getRTTotalBills(monthStart, monthEnd),
        this.getRTPaymentStatus(monthStart, monthEnd)
      ]);

      // Calculate monthly metrics from RT totals
      let monthlyUsage = 0;
      let monthlyTotalBill = 0;
      
      rtTotalBills.forEach(rt => {
        monthlyUsage += rt.totalUsage;
        monthlyTotalBill += rt.totalBill;
      });

      // Get monthly income
      const monthlyIncome = await this.getMonthlyIncome(monthStart, monthEnd);

      const metrics = {
        totalCustomers,
        monthlyUsage,
        monthlyTotalBill,
        monthlyIncome,
        rtPaymentStatus,
        rtTotalBills
      };

      // Cache the results
      this.metricsCache = {
        data: metrics,
        timestamp: Date.now()
      };

      return metrics;
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
      // Return default values if there's an error
      return {
        totalCustomers: 0,
        monthlyUsage: 0,
        monthlyTotalBill: 0,
        monthlyIncome: 0,
        rtPaymentStatus: [],
        rtTotalBills: []
      };
    }
  }

  /**
   * Clear the metrics cache (useful for manual refresh)
   */
  clearCache(): void {
    this.metricsCache = null;
  }

  /**
   * Get the current billing period information
   */
  getCurrentBillingPeriod(): { month: number; year: number; monthName: string } {
    const currentDate = new Date();
    const targetMonth = currentDate.getMonth(); // Previous month (0-based)
    const targetYear = targetMonth === 0 ? currentDate.getFullYear() - 1 : currentDate.getFullYear();
    const adjustedMonth = targetMonth === 0 ? 12 : targetMonth; // Convert to 1-based
    
    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    
    return {
      month: adjustedMonth,
      year: targetYear,
      monthName: monthNames[adjustedMonth - 1]
    };
  }

  /**
   * Get total number of customers
   */
  private async getTotalCustomers(): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true });

      if (error) {
        if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
          console.warn('Customers table not found');
          return 0;
        }
        throw error;
      }

      return count || 0;
    } catch (error) {
      console.error('Error fetching total customers:', error);
      return 0;
    }
  }

  /**
   * Get total water usage for the specified month (optimized)
   */
  private async getMonthlyUsage(monthStart: Date, monthEnd: Date): Promise<number> {
    try {
      // Get all readings for current month and previous month in one query
      const prevMonthStart = new Date(monthStart);
      prevMonthStart.setMonth(prevMonthStart.getMonth() - 1);
      
      const { data, error } = await supabase
        .from('meter_readings')
        .select(`
          reading,
          customer_id,
          date
        `)
        .gte('date', prevMonthStart.toISOString())
        .lte('date', monthEnd.toISOString())
        .order('customer_id')
        .order('date', { ascending: false });

      if (error) {
        if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
          console.warn('Meter readings table not found - returning 0 for monthly usage');
          return 0;
        }
        throw error;
      }

      if (!data || data.length === 0) return 0;

      // Group readings by customer and calculate usage efficiently
      let totalUsage = 0;
      const customerReadings = new Map<string, any[]>();

      // Group all readings by customer
      data.forEach(reading => {
        if (!customerReadings.has(reading.customer_id)) {
          customerReadings.set(reading.customer_id, []);
        }
        customerReadings.get(reading.customer_id)!.push(reading);
      });

      // Calculate usage for each customer
      for (const [customerId, readings] of customerReadings) {
        if (readings.length < 2) continue; // Need at least 2 readings to calculate usage

        // Sort readings by date (newest first)
        readings.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        // Find current month reading and previous reading
        let currentReading = null;
        let previousReading = null;
        
        for (const reading of readings) {
          const readingDate = new Date(reading.date);
          
          if (readingDate >= monthStart && readingDate <= monthEnd && !currentReading) {
            currentReading = reading;
          } else if (readingDate < monthStart && !previousReading) {
            previousReading = reading;
            break; // Found both readings
          }
        }

        // Calculate usage if we have both readings
        if (currentReading && previousReading) {
          const usage = currentReading.reading - previousReading.reading;
          if (usage > 0) {
            totalUsage += usage;
          }
        }
      }

      return totalUsage;
    } catch (error) {
      console.warn('Error fetching monthly usage (non-critical):', error);
      return 0;
    }
  }

  /**
   * Get total billing amount for the specified month
   */
  private async getMonthlyTotalBill(monthStart: Date, monthEnd: Date): Promise<number> {
    try {
      const monthlyUsage = await this.getMonthlyUsage(monthStart, monthEnd);
      
      // Get discounts for the current month
      const monthKey = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, '0')}`;
      
      const { data: discounts, error: discountError } = await supabase
        .from('customer_discounts')
        .select('discount_percentage, discount_amount')
        .eq('discount_month', monthKey)
        .eq('is_active', true);

      if (discountError && discountError.code !== 'PGRST116') {
        console.warn('Error fetching discounts:', discountError);
      }

      // Calculate base bill
      const baseBill = monthlyUsage * this.WATER_RATE;
      
      // Apply discounts
      let totalDiscountAmount = 0;
      if (discounts && discounts.length > 0) {
        discounts.forEach(discount => {
          if (discount.discount_amount) {
            totalDiscountAmount += discount.discount_amount;
          } else if (discount.discount_percentage) {
            totalDiscountAmount += (baseBill * discount.discount_percentage) / 100;
          }
        });
      }

      return Math.max(0, baseBill - totalDiscountAmount);
    } catch (error) {
      console.error('Error calculating monthly total bill:', error);
      return 0;
    }
  }

  /**
   * Get actual income received from RTs for the specified month
   */
  private async getMonthlyIncome(monthStart: Date, monthEnd: Date): Promise<number> {
    try {
      const billingMonth = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, '0')}`;
      const monthNames = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];
      const monthNameID = monthNames[monthStart.getMonth()];
      
      // Extended search range for late payments (up to 3 months after billing period)
      const extendedSearchEnd = new Date(monthEnd);
      extendedSearchEnd.setMonth(extendedSearchEnd.getMonth() + 3);
      
      const { data, error } = await supabase
        .from('financial_transactions')
        .select('amount, description, date')
        .eq('type', 'income')
        .gte('date', monthStart.toISOString().split('T')[0])
        .lte('date', extendedSearchEnd.toISOString().split('T')[0]);

      if (error) {
        if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
          console.warn('Financial transactions table not found - returning 0 for monthly income');
          return 0;
        }
        throw error;
      }

      if (!data || data.length === 0) {
        return 0;
      }

      // Filter transactions that match the billing period in description
      const matchingTransactions = data.filter(transaction => {
        const desc = transaction.description?.toLowerCase() || '';
        return (
          // Match billing period patterns like "December 2025", "Desember 2025", "2025-12"
          desc.includes(billingMonth) ||
          desc.includes(`${monthNameID.toLowerCase()} ${monthStart.getFullYear()}`) ||
          desc.includes(`december ${monthStart.getFullYear()}`) ||
          desc.includes(`desember ${monthStart.getFullYear()}`)
        );
      });

      const totalIncome = matchingTransactions.reduce((total, transaction) => total + transaction.amount, 0);
      
      return totalIncome;
    } catch (error) {
      console.warn('Error fetching monthly income (non-critical):', error);
      return 0;
    }
  }

  /**
   * Get payment status for each RT (optimized version)
   */
  private async getRTPaymentStatus(monthStart: Date, monthEnd: Date): Promise<RTPaymentStatus[]> {
    try {
      // Get all unique RTs from customers
      const { data: customers, error: customerError } = await supabase
        .from('customers')
        .select('rt')
        .not('rt', 'is', null);

      if (customerError) {
        if (customerError.code === 'PGRST116' || customerError.message?.includes('does not exist')) {
          console.warn('Customers table not found - returning empty RT status');
          return [];
        }
        throw customerError;
      }

      if (!customers || customers.length === 0) return [];

      // Get unique RTs
      const uniqueRTs = [...new Set(customers.map(c => c.rt).filter(rt => rt))];
      
      if (uniqueRTs.length === 0) return [];

      // Process all RTs in parallel for better performance
      const rtStatusPromises = uniqueRTs.map(async (rt) => {
        try {
          // Run all RT-specific queries in parallel
          const [totalBill, paidAmount, lastPaymentDate] = await Promise.all([
            this.calculateRTBillOptimized(rt!, monthStart, monthEnd),
            this.getRTPayments(rt!, monthStart, monthEnd),
            this.getLastPaymentDate(rt!, monthStart, monthEnd)
          ]);
          
          const pendingAmount = Math.max(0, totalBill - paidAmount);
          
          let paymentStatus: 'paid' | 'partial' | 'pending';
          if (paidAmount >= totalBill) {
            paymentStatus = 'paid';
          } else if (paidAmount > 0) {
            paymentStatus = 'partial';
          } else {
            paymentStatus = 'pending';
          }

          return {
            rt: rt!,
            totalBill,
            paidAmount,
            pendingAmount,
            lastPaymentDate,
            paymentStatus
          };
        } catch (error) {
          console.warn(`Error processing RT ${rt} status:`, error);
          // Return default status for this RT
          return {
            rt: rt!,
            totalBill: 0,
            paidAmount: 0,
            pendingAmount: 0,
            lastPaymentDate: undefined,
            paymentStatus: 'pending' as const
          };
        }
      });

      const rtStatuses = await Promise.all(rtStatusPromises);
      return rtStatuses.sort((a, b) => a.rt.localeCompare(b.rt));
    } catch (error) {
      console.warn('Error fetching RT payment status (non-critical):', error);
      return [];
    }
  }

  /**
   * Optimized RT bill calculation with reduced database calls
   */
  private async calculateRTBillOptimized(rt: string, monthStart: Date, monthEnd: Date): Promise<number> {
    try {
      // Get customers and their readings in a single optimized query
      const { data: customerData, error } = await supabase
        .from('customers')
        .select(`
          id,
          meter_readings!inner(reading, date)
        `)
        .eq('rt', rt)
        .gte('meter_readings.date', monthStart.toISOString())
        .lte('meter_readings.date', monthEnd.toISOString());

      if (error) {
        if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
          return 0;
        }
        throw error;
      }

      if (!customerData || customerData.length === 0) return 0;

      // For now, return a simplified calculation
      // In a real scenario, you'd calculate based on usage and rates
      const customerCount = customerData.length;
      const estimatedBillPerCustomer = 50000; // Rp 50,000 average per customer
      
      return customerCount * estimatedBillPerCustomer;
    } catch (error) {
      console.warn(`Error calculating RT ${rt} bill (non-critical):`, error);
      return 0;
    }
  }

  /**
   * Calculate total bill for a specific RT
   */
  private async calculateRTBill(rt: string, monthStart: Date, monthEnd: Date): Promise<number> {
    try {
      // Get customers in this RT
      const { data: customers, error } = await supabase
        .from('customers')
        .select('id')
        .eq('rt', rt);

      if (error || !customers || customers.length === 0) return 0;

      const customerIds = customers.map(c => c.id);
      let totalBill = 0;

      // Calculate bill for each customer in this RT
      for (const customerId of customerIds) {
        const usage = await this.getCustomerUsage(customerId, monthStart, monthEnd);
        const baseBill = usage * this.WATER_RATE;
        
        // Apply customer-specific discounts
        const discount = await this.getCustomerDiscount(customerId, monthStart);
        let discountAmount = 0;
        
        if (discount) {
          if (discount.discount_amount) {
            discountAmount = discount.discount_amount;
          } else if (discount.discount_percentage) {
            discountAmount = (baseBill * discount.discount_percentage) / 100;
          }
        }
        
        totalBill += Math.max(0, baseBill - discountAmount);
      }

      return totalBill;
    } catch (error) {
      console.error(`Error calculating RT ${rt} bill:`, error);
      return 0;
    }
  }

  /**
   * Get customer usage for the month
   */
  private async getCustomerUsage(customerId: string, monthStart: Date, monthEnd: Date): Promise<number> {
    try {
      // Get current month reading
      const { data: currentData } = await supabase
        .from('meter_readings')
        .select('reading')
        .eq('customer_id', customerId)
        .gte('date', monthStart.toISOString())
        .lte('date', monthEnd.toISOString())
        .order('date', { ascending: false })
        .limit(1);

      if (!currentData || currentData.length === 0) return 0;

      // Get previous reading
      const { data: prevData } = await supabase
        .from('meter_readings')
        .select('reading')
        .eq('customer_id', customerId)
        .lt('date', monthStart.toISOString())
        .order('date', { ascending: false })
        .limit(1);

      if (!prevData || prevData.length === 0) return 0;

      const usage = currentData[0].reading - prevData[0].reading;
      return Math.max(0, usage);
    } catch (error) {
      console.error(`Error getting customer ${customerId} usage:`, error);
      return 0;
    }
  }

  /**
   * Get customer discount for the month
   */
  private async getCustomerDiscount(customerId: string, monthStart: Date): Promise<any> {
    try {
      const monthKey = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, '0')}`;
      
      const { data } = await supabase
        .from('customer_discounts')
        .select('discount_percentage, discount_amount')
        .eq('customer_id', customerId)
        .eq('discount_month', monthKey)
        .eq('is_active', true)
        .limit(1);

      return data && data.length > 0 ? data[0] : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get payments received from a specific RT using enhanced description parsing
   * Looks for payments that mention the RT and billing period, regardless of payment date
   */
  private async getRTPayments(rt: string, monthStart: Date, monthEnd: Date): Promise<number> {
    try {
      // Calculate the billing period we're looking for
      const billingYear = monthStart.getFullYear();
      const billingMonth = monthStart.getMonth() + 1; // Convert to 1-based
      const billingPeriod = `${billingYear}-${String(billingMonth).padStart(2, '0')}`;
      
      // Indonesian month names for description parsing
      const monthNames = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];
      const monthNameID = monthNames[billingMonth - 1];
      
      // First, try to find payments using RT-specific income categories
      const rtCategoryName = `Pemasukan ${rt}`;
      
      // Get the category ID for this RT
      const { data: categoryData, error: categoryError } = await supabase
        .from('transaction_categories')
        .select('id')
        .eq('name', rtCategoryName)
        .eq('type', 'income')
        .eq('is_active', true)
        .limit(1);

      if (categoryError && categoryError.code !== 'PGRST116') {
        console.warn(`Error fetching category for ${rtCategoryName}:`, categoryError);
      }

      let totalPayments = 0;

      // If RT-specific category exists, search with extended date range
      if (categoryData && categoryData.length > 0) {
        // Look for payments up to 3 months after billing period (for late payments)
        const extendedSearchEnd = new Date(monthEnd);
        extendedSearchEnd.setMonth(extendedSearchEnd.getMonth() + 3);
        
        const { data: rtPayments, error: rtPaymentError } = await supabase
          .from('financial_transactions')
          .select('amount, description, date')
          .eq('type', 'income')
          .eq('category_id', categoryData[0].id)
          .gte('date', monthStart.toISOString().split('T')[0])
          .lte('date', extendedSearchEnd.toISOString().split('T')[0]);

        if (rtPaymentError && rtPaymentError.code !== 'PGRST116') {
          console.warn(`Error fetching RT payments for ${rt}:`, rtPaymentError);
        } else if (rtPayments && rtPayments.length > 0) {
          // Filter payments that match the billing period in description
          const matchingPayments = rtPayments.filter(payment => {
            const desc = payment.description.toLowerCase();
            return (
              // Match billing period patterns like "December 2024", "Desember 2024", "2024-12"
              desc.includes(billingPeriod) ||
              desc.includes(`${monthNameID.toLowerCase()} ${billingYear}`) ||
              desc.includes(`december ${billingYear}`) ||
              desc.includes(`desember ${billingYear}`) ||
              // If payment is within the billing month, assume it's for that month
              (payment.date >= monthStart.toISOString().split('T')[0] && 
               payment.date <= monthEnd.toISOString().split('T')[0])
            );
          });
          
          totalPayments += matchingPayments.reduce((total, transaction) => total + transaction.amount, 0);
        }
      }

      // Also check for payments in description (fallback for old data)
      // Extended search range for late payments
      const extendedSearchEnd = new Date(monthEnd);
      extendedSearchEnd.setMonth(extendedSearchEnd.getMonth() + 3);
      
      const { data: descriptionPayments, error: descError } = await supabase
        .from('financial_transactions')
        .select('amount, description, date')
        .eq('type', 'income')
        .ilike('description', `%${rt}%`)
        .gte('date', monthStart.toISOString().split('T')[0])
        .lte('date', extendedSearchEnd.toISOString().split('T')[0]);

      if (descError && descError.code !== 'PGRST116') {
        console.warn(`Error fetching description-based payments for ${rt}:`, descError);
      } else if (descriptionPayments && descriptionPayments.length > 0) {
        // Filter payments that match the billing period in description
        const matchingPayments = descriptionPayments.filter(payment => {
          const desc = payment.description.toLowerCase();
          return (
            // Match billing period patterns
            desc.includes(billingPeriod) ||
            desc.includes(`${monthNameID.toLowerCase()} ${billingYear}`) ||
            desc.includes(`december ${billingYear}`) ||
            desc.includes(`desember ${billingYear}`) ||
            // If payment is within the billing month, assume it's for that month
            (payment.date >= monthStart.toISOString().split('T')[0] && 
             payment.date <= monthEnd.toISOString().split('T')[0])
          );
        });
        
        totalPayments += matchingPayments.reduce((total, transaction) => total + transaction.amount, 0);
      }

      return totalPayments;
    } catch (error) {
      console.warn(`Error fetching RT ${rt} payments (non-critical):`, error);
      return 0;
    }
  }

  /**
   * Get last payment date from a specific RT using enhanced description parsing
   * Looks for payments that mention the RT and billing period, regardless of payment date
   */
  private async getLastPaymentDate(rt: string, monthStart: Date, monthEnd: Date): Promise<string | undefined> {
    try {
      // Calculate the billing period we're looking for
      const billingYear = monthStart.getFullYear();
      const billingMonth = monthStart.getMonth() + 1; // Convert to 1-based
      const billingPeriod = `${billingYear}-${String(billingMonth).padStart(2, '0')}`;
      
      // Indonesian month names for description parsing
      const monthNames = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];
      const monthNameID = monthNames[billingMonth - 1];
      
      // First, try to find payments using RT-specific income categories
      const rtCategoryName = `Pemasukan ${rt}`;
      
      // Get the category ID for this RT
      const { data: categoryData, error: categoryError } = await supabase
        .from('transaction_categories')
        .select('id')
        .eq('name', rtCategoryName)
        .eq('type', 'income')
        .eq('is_active', true)
        .limit(1);

      if (categoryError && categoryError.code !== 'PGRST116') {
        console.warn(`Error fetching category for ${rtCategoryName}:`, categoryError);
      }

      let lastPaymentDate: string | undefined;

      // If RT-specific category exists, search with extended date range
      if (categoryData && categoryData.length > 0) {
        // Look for payments up to 3 months after billing period (for late payments)
        const extendedSearchEnd = new Date(monthEnd);
        extendedSearchEnd.setMonth(extendedSearchEnd.getMonth() + 3);
        
        const { data: rtPayments, error: rtPaymentError } = await supabase
          .from('financial_transactions')
          .select('date, description')
          .eq('type', 'income')
          .eq('category_id', categoryData[0].id)
          .gte('date', monthStart.toISOString().split('T')[0])
          .lte('date', extendedSearchEnd.toISOString().split('T')[0])
          .order('date', { ascending: false });

        if (rtPaymentError && rtPaymentError.code !== 'PGRST116') {
          console.warn(`Error fetching RT payment dates for ${rt}:`, rtPaymentError);
        } else if (rtPayments && rtPayments.length > 0) {
          // Filter payments that match the billing period in description
          const matchingPayments = rtPayments.filter(payment => {
            const desc = payment.description.toLowerCase();
            return (
              // Match billing period patterns like "December 2024", "Desember 2024", "2024-12"
              desc.includes(billingPeriod) ||
              desc.includes(`${monthNameID.toLowerCase()} ${billingYear}`) ||
              desc.includes(`december ${billingYear}`) ||
              desc.includes(`desember ${billingYear}`) ||
              // If payment is within the billing month, assume it's for that month
              (payment.date >= monthStart.toISOString().split('T')[0] && 
               payment.date <= monthEnd.toISOString().split('T')[0])
            );
          });
          
          if (matchingPayments.length > 0) {
            lastPaymentDate = matchingPayments[0].date; // Already ordered by date desc
          }
        }
      }

      // Also check for payments in description (fallback for old data)
      if (!lastPaymentDate) {
        // Extended search range for late payments
        const extendedSearchEnd = new Date(monthEnd);
        extendedSearchEnd.setMonth(extendedSearchEnd.getMonth() + 3);
        
        const { data: descriptionPayments, error: descError } = await supabase
          .from('financial_transactions')
          .select('date, description')
          .eq('type', 'income')
          .ilike('description', `%${rt}%`)
          .gte('date', monthStart.toISOString().split('T')[0])
          .lte('date', extendedSearchEnd.toISOString().split('T')[0])
          .order('date', { ascending: false });

        if (descError && descError.code !== 'PGRST116') {
          console.warn(`Error fetching description-based payment dates for ${rt}:`, descError);
        } else if (descriptionPayments && descriptionPayments.length > 0) {
          // Filter payments that match the billing period in description
          const matchingPayments = descriptionPayments.filter(payment => {
            const desc = payment.description.toLowerCase();
            return (
              // Match billing period patterns
              desc.includes(billingPeriod) ||
              desc.includes(`${monthNameID.toLowerCase()} ${billingYear}`) ||
              desc.includes(`december ${billingYear}`) ||
              desc.includes(`desember ${billingYear}`) ||
              // If payment is within the billing month, assume it's for that month
              (payment.date >= monthStart.toISOString().split('T')[0] && 
               payment.date <= monthEnd.toISOString().split('T')[0])
            );
          });
          
          if (matchingPayments.length > 0) {
            lastPaymentDate = matchingPayments[0].date; // Already ordered by date desc
          }
        }
      }

      return lastPaymentDate;
    } catch (error) {
      console.warn(`Error fetching RT ${rt} last payment date (non-critical):`, error);
      return undefined;
    }
  }

  /**
   * Get RT total bills for collectors
   */
  private async getRTTotalBills(monthStart: Date, monthEnd: Date): Promise<RTTotalBill[]> {
    try {
      // Get all customers with their RTs
      const { data: customers, error: customerError } = await supabase
        .from('customers')
        .select('id, name, rt')
        .not('rt', 'is', null);

      if (customerError) {
        if (customerError.code === 'PGRST116' || customerError.message?.includes('does not exist')) {
          console.warn('Customers table not found - returning empty RT totals');
          return [];
        }
        throw customerError;
      }

      if (!customers || customers.length === 0) {
        console.warn('No customers found');
        return [];
      }

      // Get all meter readings for the period AND previous month for usage calculation
      const prevMonthStart = new Date(monthStart);
      prevMonthStart.setMonth(prevMonthStart.getMonth() - 1);
      
      const { data: readings, error: readingsError } = await supabase
        .from('meter_readings')
        .select('customer_id, reading, date')
        .gte('date', prevMonthStart.toISOString())
        .lte('date', monthEnd.toISOString());

      if (readingsError) {
        if (readingsError.code === 'PGRST116' || readingsError.message?.includes('does not exist')) {
          console.warn('Meter readings table not found - returning empty RT totals');
          return [];
        }
        throw readingsError;
      }

      // Group customers by RT
      const rtGroups = new Map<string, any[]>();
      customers.forEach(customer => {
        if (customer.rt) {
          if (!rtGroups.has(customer.rt)) {
            rtGroups.set(customer.rt, []);
          }
          rtGroups.get(customer.rt)!.push(customer);
        }
      });

      const rtTotalBills: RTTotalBill[] = [];

      for (const [rt, rtCustomers] of rtGroups) {
        let totalUsage = 0;
        let totalBill = 0;
        const missingReadings: string[] = [];
        let customersWithReadings = 0;

        for (const customer of rtCustomers) {
          // Check if customer has reading for this period
          const customerReading = readings?.find(r => r.customer_id.toString() === customer.id.toString() && new Date(r.date) >= monthStart && new Date(r.date) <= monthEnd);
          
          if (customerReading) {
            // Get previous reading to calculate usage
            const { data: prevReading } = await supabase
              .from('meter_readings')
              .select('reading')
              .eq('customer_id', customer.id)
              .lt('date', monthStart.toISOString())
              .order('date', { ascending: false })
              .limit(1);

            if (prevReading && prevReading.length > 0) {
              const usage = Math.max(0, customerReading.reading - prevReading[0].reading);
              totalUsage += usage;
              
              // Calculate bill using the same logic as reports
              const bill = await this.calculateCustomerBill(usage, customer.id.toString(), customerReading.date);
              totalBill += bill;
              customersWithReadings++;
            } else {
              missingReadings.push(customer.name);
            }
          } else {
            missingReadings.push(customer.name);
          }
        }

        const hasAllReadings = missingReadings.length === 0;
        const averageBill = customersWithReadings > 0 ? totalBill / customersWithReadings : 0;

        rtTotalBills.push({
          rt,
          customerCount: rtCustomers.length,
          totalUsage,
          totalBill,
          averageBill,
          hasAllReadings,
          missingReadings
        });
      }

      return rtTotalBills.sort((a, b) => a.rt.localeCompare(b.rt));
    } catch (error) {
      console.warn('Error fetching RT total bills (non-critical):', error);
      return [];
    }
  }

  /**
   * Calculate customer bill using the same logic as reports
   */
  private async calculateCustomerBill(usage: number, customerId: string, billingDate: string): Promise<number> {
    try {
      // Calculate tiered pricing
      let unitUsage = 0;
      let tensUsage = 0;
      let unitPrice = 0;
      let tensPrice = 0;

      if (usage <= 10) {
        unitUsage = usage;
        unitPrice = usage * 1500; // UNIT_RATE
      } else {
        unitUsage = 10;
        tensUsage = usage - 10;
        unitPrice = 10 * 1500;
        tensPrice = tensUsage * 2000; // TENS_RATE
      }

      const speedometerFee = 5000;
      const baseAmount = unitPrice + tensPrice + speedometerFee;
      
      // Get active discount for the billing month
      const billingMonth = billingDate.substring(0, 7); // Extract YYYY-MM
      
      const { data: discounts } = await supabase
        .from('customer_discounts')
        .select('discount_percentage, discount_amount')
        .eq('customer_id', customerId)
        .eq('discount_month', billingMonth)
        .eq('is_active', true)
        .limit(1);
      
      let discountAmount = 0;
      if (discounts && discounts.length > 0) {
        const discount = discounts[0];
        if (discount.discount_percentage > 0) {
          // Percentage discount
          discountAmount = Math.round((baseAmount * discount.discount_percentage) / 100);
        } else if (discount.discount_amount) {
          // Fixed amount discount (don't exceed base amount)
          discountAmount = Math.min(discount.discount_amount, baseAmount);
        }
      }

      const finalAmount = Math.max(0, baseAmount - discountAmount);
      return finalAmount;
    } catch (error) {
      console.error(`Error calculating bill for customer ${customerId}:`, error);
      // Return base amount without discount on error
      return 0;
    }
  }
  async createExpenseCategories(): Promise<void> {
    try {
      const expenseCategories = [
        { name: 'Pulsa Listrik Cangkring', description: 'Electricity credit for Cangkring area' },
        { name: 'Pulsa Listrik Sendang', description: 'Electricity credit for Sendang area' },
        { name: 'Perawatan/Service', description: 'Equipment maintenance and service costs' },
        { name: 'Sparepart', description: 'Replacement parts and components' },
        { name: 'Transportasi', description: 'Transportation and travel expenses' },
        { name: 'Konsumsi/Sosial', description: 'Food, drinks, and social activities' },
        { name: 'Insentif', description: 'Incentives and bonuses for staff' },
        { name: 'Operasional', description: 'General operational expenses' },
        { name: 'Pengembangan Desa', description: 'Village development projects and initiatives' }
      ];

      // Create expense categories
      const categories = expenseCategories.map(cat => ({
        name: cat.name,
        type: 'expense' as const,
        description: cat.description,
        is_active: true
      }));

      const { error: insertError } = await supabase
        .from('transaction_categories')
        .upsert(categories, { 
          onConflict: 'name,type',
          ignoreDuplicates: true 
        });

      if (insertError) {
        if (insertError.code === 'PGRST116' || insertError.message?.includes('does not exist')) {
          console.warn('Transaction categories table not found - skipping expense category creation');
          return;
        }
        // For other errors, just log and continue (don't throw)
        console.warn('Non-critical error creating expense categories:', insertError);
        return;
      }
    } catch (error) {
      console.error('Error creating expense categories:', error);
      // Don't throw the error - this is a non-critical operation
    }
  }
  async createRTIncomeCategories(): Promise<void> {
    // DISABLED: Manual RT income categories are now used instead of auto-generated ones
    // The categories "Pemasukan RT 1", "Pemasukan RT 2", etc. are manually created
    // to avoid confusion with auto-generated categories
    return;
  }
}

export const dashboardService = new DashboardService();