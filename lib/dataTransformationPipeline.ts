/**
 * Data Transformation Pipeline
 * Orchestrates the complete flow from raw meter data to processed billing data
 */

import { Customer, MeterReading, CustomerDiscount } from '@/types/types';
import { MeterDataService, UsageCalculation, BillingCalculation } from './meterDataService';
import { offlineStorage } from './offlineStorage';
import { formatDateID } from '@/utils/dateFormat';

export interface ProcessedMeterData {
  customer: Customer;
  currentReading: MeterReading;
  previousReading: MeterReading | null;
  usage: UsageCalculation;
  billing: BillingCalculation;
  processedAt: Date;
}

export interface PipelineFilters {
  startDate?: string;
  endDate?: string;
  customerIds?: string[];
  rtNumbers?: string[];
  minUsage?: number;
  maxUsage?: number;
}

export interface PipelineMetrics {
  totalCustomers: number;
  totalReadings: number;
  totalUsage: number;
  totalBilling: number;
  totalDiscounts: number;
  averageUsage: number;
  processingTime: number;
}

export class DataTransformationPipeline {
  /**
   * Transform raw meter readings into complete billing data
   */
  static async transformMeterDataToBilling(
    filters: PipelineFilters = {}
  ): Promise<{
    data: ProcessedMeterData[];
    metrics: PipelineMetrics;
    errors: string[];
  }> {
    const startTime = Date.now();
    const errors: string[] = [];
    const processedData: ProcessedMeterData[] = [];

    try {
      // Step 1: Get filtered customers and readings
      const customers = this.getFilteredCustomers(filters);
      const readings = this.getFilteredReadings(filters);

      console.log(`Pipeline processing ${customers.length} customers, ${readings.length} readings`);

      // Step 2: Group readings by customer
      const readingsByCustomer = this.groupReadingsByCustomer(readings);

      // Step 3: Process each customer's data
      for (const customer of customers) {
        const customerReadings = readingsByCustomer.get(customer.id) || [];
        
        // Process each reading for this customer
        for (const reading of customerReadings) {
          try {
            // Calculate usage
            const usage = MeterDataService.calculateUsage(customer.id, reading);
            
            // Calculate billing
            const billing = MeterDataService.calculateBilling(
              customer.id,
              usage.usage,
              reading.date
            );

            // Create processed data entry
            const processedEntry: ProcessedMeterData = {
              customer,
              currentReading: reading,
              previousReading: usage.previousReading,
              usage,
              billing,
              processedAt: new Date()
            };

            processedData.push(processedEntry);
          } catch (error) {
            console.error(`Error processing reading for customer ${customer.name}:`, error);
            errors.push(`Error processing ${customer.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
      }

      // Step 4: Calculate metrics
      const metrics = this.calculatePipelineMetrics(processedData, Date.now() - startTime);

      console.log(`Pipeline completed: ${processedData.length} entries processed in ${metrics.processingTime}ms`);

      return {
        data: processedData,
        metrics,
        errors
      };
    } catch (error) {
      console.error('Pipeline transformation error:', error);
      return {
        data: [],
        metrics: this.getEmptyMetrics(Date.now() - startTime),
        errors: [error instanceof Error ? error.message : 'Unknown pipeline error']
      };
    }
  }

  /**
   * Transform data for monthly billing reports
   */
  static async generateMonthlyBillingReport(
    year: number,
    month: number
  ): Promise<{
    data: ProcessedMeterData[];
    summary: {
      totalCustomers: number;
      totalUsage: number;
      totalBilling: number;
      totalDiscounts: number;
      netBilling: number;
      averageUsagePerCustomer: number;
      averageBillPerCustomer: number;
    };
    rtBreakdown: Map<string, {
      customers: number;
      usage: number;
      billing: number;
      discounts: number;
    }>;
  }> {
    try {
      // Create date range for the month
      const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
      const endDate = new Date(year, month, 0).toISOString().split('T')[0];

      // Transform data for the month
      const result = await this.transformMeterDataToBilling({
        startDate,
        endDate
      });

      // Calculate summary
      const summary = {
        totalCustomers: result.metrics.totalCustomers,
        totalUsage: result.metrics.totalUsage,
        totalBilling: result.metrics.totalBilling,
        totalDiscounts: result.metrics.totalDiscounts,
        netBilling: result.metrics.totalBilling - result.metrics.totalDiscounts,
        averageUsagePerCustomer: result.metrics.averageUsage,
        averageBillPerCustomer: result.metrics.totalCustomers > 0 
          ? result.metrics.totalBilling / result.metrics.totalCustomers 
          : 0
      };

      // Calculate RT breakdown
      const rtBreakdown = new Map<string, {
        customers: number;
        usage: number;
        billing: number;
        discounts: number;
      }>();

      result.data.forEach(entry => {
        const rt = entry.customer.rt || 'Unknown';
        const existing = rtBreakdown.get(rt) || {
          customers: 0,
          usage: 0,
          billing: 0,
          discounts: 0
        };

        existing.customers += 1;
        existing.usage += entry.usage.usage;
        existing.billing += entry.billing.finalAmount;
        existing.discounts += entry.billing.discountAmount;

        rtBreakdown.set(rt, existing);
      });

      return {
        data: result.data,
        summary,
        rtBreakdown
      };
    } catch (error) {
      console.error('Error generating monthly billing report:', error);
      throw error;
    }
  }

  /**
   * Get filtered customers based on criteria
   */
  private static getFilteredCustomers(filters: PipelineFilters): Customer[] {
    let customers = offlineStorage.getCustomers();

    if (filters.customerIds && filters.customerIds.length > 0) {
      customers = customers.filter(c => filters.customerIds!.includes(c.id));
    }

    if (filters.rtNumbers && filters.rtNumbers.length > 0) {
      customers = customers.filter(c => c.rt && filters.rtNumbers!.includes(c.rt));
    }

    return customers;
  }

  /**
   * Get filtered readings based on criteria
   */
  private static getFilteredReadings(filters: PipelineFilters): MeterReading[] {
    let readings = offlineStorage.getReadings();

    if (filters.startDate) {
      readings = readings.filter(r => r.date >= filters.startDate!);
    }

    if (filters.endDate) {
      readings = readings.filter(r => r.date <= filters.endDate!);
    }

    if (filters.customerIds && filters.customerIds.length > 0) {
      readings = readings.filter(r => filters.customerIds!.includes(r.customer_id));
    }

    // Sort by date for proper processing
    readings.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return readings;
  }

  /**
   * Group readings by customer ID
   */
  private static groupReadingsByCustomer(readings: MeterReading[]): Map<string, MeterReading[]> {
    const grouped = new Map<string, MeterReading[]>();

    readings.forEach(reading => {
      const existing = grouped.get(reading.customer_id) || [];
      existing.push(reading);
      grouped.set(reading.customer_id, existing);
    });

    // Sort each customer's readings by date
    grouped.forEach(customerReadings => {
      customerReadings.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    });

    return grouped;
  }

  /**
   * Calculate pipeline processing metrics
   */
  private static calculatePipelineMetrics(
    data: ProcessedMeterData[],
    processingTime: number
  ): PipelineMetrics {
    const uniqueCustomers = new Set(data.map(d => d.customer.id));
    const totalUsage = data.reduce((sum, d) => sum + d.usage.usage, 0);
    const totalBilling = data.reduce((sum, d) => sum + d.billing.finalAmount, 0);
    const totalDiscounts = data.reduce((sum, d) => sum + d.billing.discountAmount, 0);

    return {
      totalCustomers: uniqueCustomers.size,
      totalReadings: data.length,
      totalUsage,
      totalBilling,
      totalDiscounts,
      averageUsage: data.length > 0 ? totalUsage / data.length : 0,
      processingTime
    };
  }

  /**
   * Get empty metrics for error cases
   */
  private static getEmptyMetrics(processingTime: number): PipelineMetrics {
    return {
      totalCustomers: 0,
      totalReadings: 0,
      totalUsage: 0,
      totalBilling: 0,
      totalDiscounts: 0,
      averageUsage: 0,
      processingTime
    };
  }

  /**
   * Validate pipeline data integrity
   */
  static validateDataIntegrity(data: ProcessedMeterData[]): {
    isValid: boolean;
    issues: string[];
    warnings: string[];
  } {
    const issues: string[] = [];
    const warnings: string[] = [];

    try {
      // Check for missing data
      data.forEach((entry, index) => {
        if (!entry.customer.id) {
          issues.push(`Entry ${index}: Missing customer ID`);
        }
        if (!entry.currentReading.id) {
          issues.push(`Entry ${index}: Missing reading ID`);
        }
        if (entry.usage.usage < 0) {
          issues.push(`Entry ${index}: Negative usage (${entry.usage.usage})`);
        }
        if (entry.billing.finalAmount < 0) {
          issues.push(`Entry ${index}: Negative billing amount (${entry.billing.finalAmount})`);
        }

        // Warnings for unusual data
        if (entry.usage.usage > 100) {
          warnings.push(`Entry ${index}: High usage (${entry.usage.usage} m³) for ${entry.customer.name}`);
        }
        if (entry.billing.discountAmount > entry.billing.baseAmount) {
          warnings.push(`Entry ${index}: Discount exceeds base amount for ${entry.customer.name}`);
        }
      });

      return {
        isValid: issues.length === 0,
        issues,
        warnings
      };
    } catch (error) {
      return {
        isValid: false,
        issues: ['Error during data integrity validation'],
        warnings: []
      };
    }
  }

  /**
   * Export processed data in various formats
   */
  static formatForExport(
    data: ProcessedMeterData[],
    format: 'csv' | 'pdf' | 'json' = 'json'
  ): any {
    switch (format) {
      case 'csv':
        return data.map(entry => ({
          'Nama Pelanggan': entry.customer.name,
          'RT': entry.customer.rt || '',
          'Telepon': entry.customer.phone || '',
          'Tanggal Baca': formatDateID(new Date(entry.currentReading.date)),
          'Pembacaan Sebelumnya': entry.previousReading?.reading || 0,
          'Pembacaan Saat Ini': entry.currentReading.reading,
          'Pemakaian (m³)': entry.usage.usage,
          'Tarif 1-10 m³': entry.billing.unitPrice,
          'Tarif 11+ m³': entry.billing.tensPrice,
          'Biaya Speedometer': entry.billing.speedometerFee,
          'Jumlah Dasar': entry.billing.baseAmount,
          'Diskon': entry.billing.discountAmount,
          'Total Tagihan': entry.billing.finalAmount
        }));

      case 'json':
        return data;

      case 'pdf':
        // Return structured data for PDF generation
        return data.map(entry => ({
          customer: entry.customer,
          reading: {
            previous: entry.previousReading?.reading || 0,
            current: entry.currentReading.reading,
            date: formatDateID(new Date(entry.currentReading.date))
          },
          usage: entry.usage.usage,
          billing: {
            unit: { usage: entry.billing.unitUsage, price: entry.billing.unitPrice },
            tens: { usage: entry.billing.tensUsage, price: entry.billing.tensPrice },
            speedometer: entry.billing.speedometerFee,
            base: entry.billing.baseAmount,
            discount: entry.billing.discountAmount,
            final: entry.billing.finalAmount
          }
        }));

      default:
        return data;
    }
  }
}

export default DataTransformationPipeline;