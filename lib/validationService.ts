/**
 * Comprehensive Validation Service
 * Handles all validation logic for the water meter system
 */

import { Customer, MeterReading, CustomerDiscount } from '@/types/types';
import { offlineStorage } from './offlineStorage';

export interface ValidationRule {
  name: string;
  validate: (value: any, context?: any) => ValidationResult;
  severity: 'error' | 'warning' | 'info';
}

export interface ValidationResult {
  isValid: boolean;
  message?: string;
  code?: string;
}

export interface ValidationContext {
  customerId?: string;
  readingDate?: string;
  excludeReadingId?: string;
  previousReading?: MeterReading;
  fiveMonthAverage?: number;
}

export class ValidationService {
  // Validation constants
  private static readonly CONSTANTS = {
    MIN_READING: 0,
    MAX_READING: 999999,
    MAX_USAGE_MULTIPLIER: 2.0, // 200% of 5-month average
    MIN_PHONE_LENGTH: 10,
    MAX_PHONE_LENGTH: 15,
    RT_PATTERN: /^RT\s+\d{2}$/i, // RT 01, RT 02, etc.
    PHONE_PATTERN: /^(\+62|62|0)[0-9]{8,13}$/, // Indonesian phone formats
    MAX_DISCOUNT_PERCENTAGE: 100,
    MIN_DISCOUNT_AMOUNT: 0,
    MAX_DISCOUNT_AMOUNT: 1000000 // 1 million IDR
  };

  /**
   * Validate customer data
   */
  static validateCustomer(customer: Partial<Customer>): ValidationResult[] {
    const results: ValidationResult[] = [];

    // Name validation
    if (!customer.name || customer.name.trim().length === 0) {
      results.push({
        isValid: false,
        message: 'Nama pelanggan wajib diisi',
        code: 'CUSTOMER_NAME_REQUIRED'
      });
    } else if (customer.name.trim().length < 2) {
      results.push({
        isValid: false,
        message: 'Nama pelanggan minimal 2 karakter',
        code: 'CUSTOMER_NAME_TOO_SHORT'
      });
    }

    // RT validation
    if (customer.rt && !this.CONSTANTS.RT_PATTERN.test(customer.rt)) {
      results.push({
        isValid: false,
        message: 'Format RT tidak valid. Gunakan format "RT 01", "RT 02", dll.',
        code: 'CUSTOMER_RT_INVALID_FORMAT'
      });
    }

    // Phone validation
    if (customer.phone) {
      if (!this.CONSTANTS.PHONE_PATTERN.test(customer.phone)) {
        results.push({
          isValid: false,
          message: 'Format nomor telepon tidak valid. Gunakan format Indonesia (+62, 08xx)',
          code: 'CUSTOMER_PHONE_INVALID_FORMAT'
        });
      }
    }

    // Check RT uniqueness (if creating new customer)
    if (customer.rt && !customer.id) {
      const existingCustomers = offlineStorage.getCustomers();
      const rtExists = existingCustomers.some(c => c.rt === customer.rt);
      if (rtExists) {
        results.push({
          isValid: false,
          message: `RT ${customer.rt} sudah digunakan oleh pelanggan lain`,
          code: 'CUSTOMER_RT_DUPLICATE'
        });
      }
    }

    return results;
  }

  /**
   * Validate meter reading
   */
  static async validateMeterReading(
    reading: number,
    context: ValidationContext
  ): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    try {
      // Basic value validation
      if (reading < this.CONSTANTS.MIN_READING || reading > this.CONSTANTS.MAX_READING) {
        results.push({
          isValid: false,
          message: `Pembacaan meter harus antara ${this.CONSTANTS.MIN_READING} dan ${this.CONSTANTS.MAX_READING}`,
          code: 'READING_OUT_OF_RANGE'
        });
      }

      if (!context.customerId) {
        results.push({
          isValid: false,
          message: 'ID pelanggan diperlukan untuk validasi',
          code: 'CUSTOMER_ID_REQUIRED'
        });
        return results;
      }

      if (!context.readingDate) {
        results.push({
          isValid: false,
          message: 'Tanggal pembacaan diperlukan untuk validasi',
          code: 'READING_DATE_REQUIRED'
        });
        return results;
      }

      // Check for duplicate reading in the same month
      const isDuplicate = offlineStorage.checkDuplicateReading(
        context.customerId,
        context.readingDate,
        context.excludeReadingId
      );

      if (isDuplicate) {
        results.push({
          isValid: false,
          message: 'Sudah ada pembacaan meter untuk bulan ini',
          code: 'READING_DUPLICATE_MONTH'
        });
      }

      // Get previous reading for sequential validation
      const previousReading = context.previousReading || 
        offlineStorage.getPreviousReading(context.customerId, context.readingDate);

      if (previousReading) {
        // Sequential rule validation
        if (reading < previousReading.reading) {
          results.push({
            isValid: false,
            message: `Pembacaan baru (${reading}) tidak boleh lebih kecil dari pembacaan sebelumnya (${previousReading.reading})`,
            code: 'READING_SEQUENTIAL_VIOLATION'
          });
        }

        // Anomaly detection
        const usage = reading - previousReading.reading;
        const fiveMonthAverage = context.fiveMonthAverage || 
          offlineStorage.calculateFiveMonthAverage(context.customerId, context.readingDate);

        if (fiveMonthAverage && fiveMonthAverage > 0 && usage > (fiveMonthAverage * this.CONSTANTS.MAX_USAGE_MULTIPLIER)) {
          results.push({
            isValid: true, // This is a warning, not an error
            message: `Pemakaian tinggi: ${usage} m³ melebihi ${this.CONSTANTS.MAX_USAGE_MULTIPLIER * 100}% dari rata-rata 5 bulan (${fiveMonthAverage.toFixed(1)} m³)`,
            code: 'READING_USAGE_ANOMALY'
          });
        }

        // Zero usage warning
        if (usage === 0) {
          results.push({
            isValid: true, // Warning, not error
            message: 'Pemakaian 0 m³ - pastikan pembacaan sudah benar',
            code: 'READING_ZERO_USAGE'
          });
        }

        // Very high usage warning
        if (usage > 100) {
          results.push({
            isValid: true, // Warning, not error
            message: `Pemakaian sangat tinggi: ${usage} m³ - pastikan pembacaan sudah benar`,
            code: 'READING_VERY_HIGH_USAGE'
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Error validating meter reading:', error);
      return [{
        isValid: false,
        message: 'Terjadi kesalahan saat validasi pembacaan meter',
        code: 'READING_VALIDATION_ERROR'
      }];
    }
  }

  /**
   * Validate discount data
   */
  static validateDiscount(discount: Partial<CustomerDiscount>): ValidationResult[] {
    const results: ValidationResult[] = [];

    // Customer ID validation
    if (!discount.customer_id) {
      results.push({
        isValid: false,
        message: 'ID pelanggan wajib diisi',
        code: 'DISCOUNT_CUSTOMER_ID_REQUIRED'
      });
    }

    // Discount type validation
    const hasPercentage = discount.discount_percentage && discount.discount_percentage > 0;
    const hasAmount = discount.discount_amount && discount.discount_amount > 0;

    if (!hasPercentage && !hasAmount) {
      results.push({
        isValid: false,
        message: 'Nilai diskon (persentase atau jumlah) wajib diisi',
        code: 'DISCOUNT_VALUE_REQUIRED'
      });
    }

    if (hasPercentage && hasAmount) {
      results.push({
        isValid: false,
        message: 'Tidak boleh menggunakan diskon persentase dan jumlah bersamaan',
        code: 'DISCOUNT_MULTIPLE_TYPES'
      });
    }

    // Percentage validation
    if (hasPercentage) {
      if (discount.discount_percentage! > this.CONSTANTS.MAX_DISCOUNT_PERCENTAGE) {
        results.push({
          isValid: false,
          message: `Persentase diskon tidak boleh lebih dari ${this.CONSTANTS.MAX_DISCOUNT_PERCENTAGE}%`,
          code: 'DISCOUNT_PERCENTAGE_TOO_HIGH'
        });
      }
    }

    // Amount validation
    if (hasAmount) {
      if (discount.discount_amount! < this.CONSTANTS.MIN_DISCOUNT_AMOUNT) {
        results.push({
          isValid: false,
          message: `Jumlah diskon tidak boleh kurang dari Rp ${this.CONSTANTS.MIN_DISCOUNT_AMOUNT.toLocaleString('id-ID')}`,
          code: 'DISCOUNT_AMOUNT_TOO_LOW'
        });
      }

      if (discount.discount_amount! > this.CONSTANTS.MAX_DISCOUNT_AMOUNT) {
        results.push({
          isValid: false,
          message: `Jumlah diskon tidak boleh lebih dari Rp ${this.CONSTANTS.MAX_DISCOUNT_AMOUNT.toLocaleString('id-ID')}`,
          code: 'DISCOUNT_AMOUNT_TOO_HIGH'
        });
      }
    }

    // Reason validation
    if (!discount.reason || discount.reason.trim().length === 0) {
      results.push({
        isValid: false,
        message: 'Alasan pemberian diskon wajib diisi',
        code: 'DISCOUNT_REASON_REQUIRED'
      });
    } else if (discount.reason.trim().length < 5) {
      results.push({
        isValid: false,
        message: 'Alasan pemberian diskon minimal 5 karakter',
        code: 'DISCOUNT_REASON_TOO_SHORT'
      });
    }

    // Month format validation
    if (!discount.discount_month) {
      results.push({
        isValid: false,
        message: 'Bulan diskon wajib diisi',
        code: 'DISCOUNT_MONTH_REQUIRED'
      });
    } else if (!/^\d{4}-\d{2}$/.test(discount.discount_month)) {
      results.push({
        isValid: false,
        message: 'Format bulan diskon tidak valid (gunakan YYYY-MM)',
        code: 'DISCOUNT_MONTH_INVALID_FORMAT'
      });
    }

    // Check for existing active discount in the same month
    if (discount.customer_id && discount.discount_month && !discount.id) {
      const existingDiscount = offlineStorage.getCustomerActiveDiscount(
        discount.customer_id,
        discount.discount_month
      );
      if (existingDiscount) {
        results.push({
          isValid: false,
          message: `Sudah ada diskon aktif untuk bulan ${discount.discount_month}`,
          code: 'DISCOUNT_DUPLICATE_MONTH'
        });
      }
    }

    return results;
  }

  /**
   * Validate date format and range
   */
  static validateDate(date: string, fieldName: string = 'Tanggal'): ValidationResult {
    if (!date) {
      return {
        isValid: false,
        message: `${fieldName} wajib diisi`,
        code: 'DATE_REQUIRED'
      };
    }

    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      return {
        isValid: false,
        message: `Format ${fieldName.toLowerCase()} tidak valid`,
        code: 'DATE_INVALID_FORMAT'
      };
    }

    // Check if date is not too far in the future (more than 1 month)
    const oneMonthFromNow = new Date();
    oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);
    
    if (dateObj > oneMonthFromNow) {
      return {
        isValid: false,
        message: `${fieldName} tidak boleh lebih dari 1 bulan ke depan`,
        code: 'DATE_TOO_FUTURE'
      };
    }

    // Check if date is not too far in the past (more than 2 years)
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    
    if (dateObj < twoYearsAgo) {
      return {
        isValid: false,
        message: `${fieldName} tidak boleh lebih dari 2 tahun yang lalu`,
        code: 'DATE_TOO_PAST'
      };
    }

    return {
      isValid: true,
      code: 'DATE_VALID'
    };
  }

  /**
   * Get validation summary
   */
  static getValidationSummary(results: ValidationResult[]): {
    isValid: boolean;
    errorCount: number;
    warningCount: number;
    errors: ValidationResult[];
    warnings: ValidationResult[];
  } {
    const errors = results.filter(r => !r.isValid);
    const warnings = results.filter(r => r.isValid && r.message);

    return {
      isValid: errors.length === 0,
      errorCount: errors.length,
      warningCount: warnings.length,
      errors,
      warnings
    };
  }

  /**
   * Format validation messages for display
   */
  static formatValidationMessages(results: ValidationResult[]): string[] {
    return results
      .filter(r => r.message)
      .map(r => r.message!);
  }

  /**
   * Check if validation result has specific error code
   */
  static hasErrorCode(results: ValidationResult[], code: string): boolean {
    return results.some(r => r.code === code);
  }

  /**
   * Get validation constants for UI display
   */
  static getValidationConstants() {
    return { ...this.CONSTANTS };
  }

  /**
   * Find duplicate transactions
   */
  static async findDuplicateTransactions(transaction: any): Promise<any[]> {
    // This is a placeholder implementation
    // In a real scenario, you would query the database for similar transactions
    // For now, return empty array (no duplicates found)
    return [];
  }

  /**
   * Validate transaction
   */
  static validateTransaction(transaction: any): { isValid: boolean; errors?: any[] } {
    // Basic transaction validation
    if (!transaction.amount || transaction.amount <= 0) {
      return {
        isValid: false,
        errors: [{ message: 'Amount must be greater than 0' }]
      };
    }

    if (!transaction.type || !['income', 'expense'].includes(transaction.type)) {
      return {
        isValid: false,
        errors: [{ message: 'Invalid transaction type' }]
      };
    }

    if (!transaction.date) {
      return {
        isValid: false,
        errors: [{ message: 'Date is required' }]
      };
    }

    return { isValid: true };
  }

  /**
   * Check if transaction is duplicate (boolean version)
   */
  static async checkDuplicateTransaction(transaction: any): Promise<boolean> {
    const duplicates = await this.findDuplicateTransactions(transaction);
    return duplicates.length > 0;
  }
}

export default ValidationService;