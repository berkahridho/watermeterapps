/**
 * Centralized Meter Data Service
 * Handles the complete data transformation pipeline from raw meter readings to billing
 */

import { supabase } from './supabase';
import { Customer, MeterReading, CustomerDiscount } from '@/types/types';
import { offlineStorage } from './offlineStorage';

export interface UsageCalculation {
  customerId: string;
  currentReading: MeterReading;
  previousReading: MeterReading | null;
  usage: number;
  isValid: boolean;
  validationErrors: string[];
  anomalyWarning?: string;
}

export interface BillingCalculation {
  customerId: string;
  usage: number;
  unitUsage: number; // 1-10 m³
  tensUsage: number; // 11+ m³
  unitPrice: number;
  tensPrice: number;
  speedometerFee: number;
  baseAmount: number;
  discount?: CustomerDiscount;
  discountAmount: number;
  finalAmount: number;
  billingMonth: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class MeterDataService {
  // Centralized pricing constants
  private static readonly PRICING = {
    UNIT_RATE: 1500,      // IDR per m³ for 1-10 m³
    TENS_RATE: 2000,      // IDR per m³ for 11+ m³
    SPEEDOMETER_FEE: 5000 // Fixed fee in IDR
  };

  // Validation thresholds
  private static readonly VALIDATION = {
    MAX_USAGE_MULTIPLIER: 2.0,  // 200% of 5-month average
    MIN_READING_VALUE: 0,
    MAX_READING_VALUE: 999999
  };

  /**
   * Validate a new meter reading before processing
   */
  static async validateMeterReading(
    customerId: string,
    newReading: number,
    readingDate: string,
    excludeReadingId?: string
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Basic value validation
      if (newReading < this.VALIDATION.MIN_READING_VALUE || newReading > this.VALIDATION.MAX_READING_VALUE) {
        errors.push(`Pembacaan meter harus antara ${this.VALIDATION.MIN_READING_VALUE} dan ${this.VALIDATION.MAX_READING_VALUE}`);
      }

      // Check for duplicate reading in the same month
      const isDuplicate = offlineStorage.checkDuplicateReading(customerId, readingDate, excludeReadingId);
      if (isDuplicate) {
        errors.push('Sudah ada pembacaan meter untuk bulan ini');
      }

      // Get previous reading for sequential validation
      const previousReading = offlineStorage.getPreviousReading(customerId, readingDate);
      if (previousReading) {
        // Sequential rule: new reading must be >= previous reading
        if (newReading < previousReading.reading) {
          errors.push(`Pembacaan baru (${newReading}) tidak boleh lebih kecil dari pembacaan sebelumnya (${previousReading.reading})`);
        }

        // Anomaly detection
        const usage = newReading - previousReading.reading;
        const fiveMonthAverage = offlineStorage.calculateFiveMonthAverage(customerId, readingDate);
        
        if (fiveMonthAverage && fiveMonthAverage > 0 && usage > (fiveMonthAverage * this.VALIDATION.MAX_USAGE_MULTIPLIER)) {
          warnings.push(`Pemakaian ${usage} m³ melebihi ${this.VALIDATION.MAX_USAGE_MULTIPLIER * 100}% dari rata-rata 5 bulan (${fiveMonthAverage.toFixed(1)} m³)`);
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };
    } catch (error) {
      console.error('Error validating meter reading:', error);
      return {
        isValid: false,
        errors: ['Terjadi kesalahan saat validasi pembacaan meter'],
        warnings: []
      };
    }
  }

  /**
   * Calculate usage from meter readings with validation
   */
  static calculateUsage(
    customerId: string,
    currentReading: MeterReading,
    previousReading: MeterReading | null = null
  ): UsageCalculation {
    const validationErrors: string[] = [];
    let usage = 0;
    let anomalyWarning: string | undefined;

    try {
      // Get previous reading if not provided
      if (!previousReading) {
        previousReading = offlineStorage.getPreviousReading(customerId, currentReading.date);
      }

      if (previousReading) {
        usage = Math.max(0, currentReading.reading - previousReading.reading);
        
        // Check for anomaly
        const fiveMonthAverage = offlineStorage.calculateFiveMonthAverage(customerId, currentReading.date);
        if (fiveMonthAverage && fiveMonthAverage > 0 && usage > (fiveMonthAverage * this.VALIDATION.MAX_USAGE_MULTIPLIER)) {
          anomalyWarning = `Pemakaian tinggi: ${usage} m³ (rata-rata 5 bulan: ${fiveMonthAverage.toFixed(1)} m³)`;
        }
      } else {
        // First reading for customer
        usage = 0;
        validationErrors.push('Tidak ada pembacaan sebelumnya untuk menghitung pemakaian');
      }

      return {
        customerId,
        currentReading,
        previousReading,
        usage,
        isValid: validationErrors.length === 0,
        validationErrors,
        anomalyWarning
      };
    } catch (error) {
      console.error('Error calculating usage:', error);
      return {
        customerId,
        currentReading,
        previousReading,
        usage: 0,
        isValid: false,
        validationErrors: ['Terjadi kesalahan saat menghitung pemakaian'],
        anomalyWarning
      };
    }
  }

  /**
   * Calculate billing amount from usage with discount application
   */
  static calculateBilling(
    customerId: string,
    usage: number,
    billingDate: string
  ): BillingCalculation {
    try {
      // Calculate tiered pricing
      let unitUsage = 0;
      let tensUsage = 0;
      let unitPrice = 0;
      let tensPrice = 0;

      if (usage <= 10) {
        unitUsage = usage;
        unitPrice = usage * this.PRICING.UNIT_RATE;
      } else {
        unitUsage = 10;
        tensUsage = usage - 10;
        unitPrice = 10 * this.PRICING.UNIT_RATE;
        tensPrice = tensUsage * this.PRICING.TENS_RATE;
      }

      const baseAmount = unitPrice + tensPrice + this.PRICING.SPEEDOMETER_FEE;
      
      // Get active discount for the billing month
      const billingMonth = billingDate.substring(0, 7); // Extract YYYY-MM
      const discount = offlineStorage.getCustomerActiveDiscount(customerId, billingMonth);
      
      let discountAmount = 0;
      if (discount) {
        if (discount.discount_percentage > 0) {
          // Percentage discount
          discountAmount = Math.round((baseAmount * discount.discount_percentage) / 100);
        } else if (discount.discount_amount) {
          // Fixed amount discount (don't exceed base amount)
          discountAmount = Math.min(discount.discount_amount, baseAmount);
        }
      }

      const finalAmount = Math.max(0, baseAmount - discountAmount);

      return {
        customerId,
        usage,
        unitUsage,
        tensUsage,
        unitPrice,
        tensPrice,
        speedometerFee: this.PRICING.SPEEDOMETER_FEE,
        baseAmount,
        discount: discount || undefined,
        discountAmount,
        finalAmount,
        billingMonth
      };
    } catch (error) {
      console.error('Error calculating billing:', error);
      // Return safe defaults
      return {
        customerId,
        usage,
        unitUsage: 0,
        tensUsage: 0,
        unitPrice: 0,
        tensPrice: 0,
        speedometerFee: this.PRICING.SPEEDOMETER_FEE,
        baseAmount: this.PRICING.SPEEDOMETER_FEE,
        discountAmount: 0,
        finalAmount: this.PRICING.SPEEDOMETER_FEE,
        billingMonth: billingDate.substring(0, 7)
      };
    }
  }

  /**
   * Process complete meter reading pipeline: validation → usage → billing
   */
  static async processMeterReading(
    customerId: string,
    reading: number,
    date: string
  ): Promise<{
    validation: ValidationResult;
    usage?: UsageCalculation;
    billing?: BillingCalculation;
  }> {
    try {
      // Step 1: Validate the reading
      const validation = await this.validateMeterReading(customerId, reading, date);
      
      if (!validation.isValid) {
        return { validation };
      }

      // Step 2: Create meter reading object
      const meterReading: MeterReading = {
        id: '', // Will be set when saved
        customer_id: customerId,
        reading,
        date
      };

      // Step 3: Calculate usage
      const usage = this.calculateUsage(customerId, meterReading);
      
      // Step 4: Calculate billing
      const billing = this.calculateBilling(customerId, usage.usage, date);

      return {
        validation,
        usage,
        billing
      };
    } catch (error) {
      console.error('Error processing meter reading:', error);
      return {
        validation: {
          isValid: false,
          errors: ['Terjadi kesalahan saat memproses pembacaan meter'],
          warnings: []
        }
      };
    }
  }

  /**
   * Batch process multiple readings for reporting
   */
  static async batchProcessReadings(
    readings: MeterReading[],
    customers: Customer[]
  ): Promise<BillingCalculation[]> {
    const results: BillingCalculation[] = [];
    
    try {
      for (const reading of readings) {
        const usage = this.calculateUsage(reading.customer_id, reading);
        const billing = this.calculateBilling(reading.customer_id, usage.usage, reading.date);
        results.push(billing);
      }
      
      return results;
    } catch (error) {
      console.error('Error batch processing readings:', error);
      return [];
    }
  }

  /**
   * Get pricing information
   */
  static getPricing() {
    return { ...this.PRICING };
  }

  /**
   * Get validation thresholds
   */
  static getValidationThresholds() {
    return { ...this.VALIDATION };
  }
}

export default MeterDataService;