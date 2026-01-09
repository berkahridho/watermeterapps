export interface Customer {
  id: string;
  name: string;
  rt?: string;
  phone?: string;
}

export interface MeterReading {
  id: string;
  customer_id: string;
  reading: number;
  date: string; // ISO string format
  usage?: number; // Calculated field for usage since last reading
}

export interface MeterAdjustment {
  id: string;
  customer_id: string;
  old_reading: number;
  new_reading: number;
  adjustment_type: 'gauge_replacement' | 'manual_correction' | 'meter_reset';
  reason: string;
  adjustment_date: string;
  created_by: string;
  created_at: string;
  notes?: string;
  customer?: Customer;
}

export interface CustomerDiscount {
  id: string;
  customer_id: string;
  discount_percentage: number;
  discount_amount?: number; // Fixed amount discount
  reason: string;
  discount_month: string; // Format: YYYY-MM (e.g., "2025-01")
  created_by: string;
  created_at: string;
  is_active: boolean;
}

export interface ReportData {
  customer: Customer;
  currentReading: MeterReading;
  previousReading?: MeterReading;
  usage: number;
  discount?: CustomerDiscount;
  originalAmount?: number;
  discountedAmount?: number;
}

// Dashboard metrics types
export interface DashboardMetrics {
  totalCustomers: number;
  monthlyUsage: number; // Total usage in m³ for current month
  monthlyTotalBill: number; // Total billing amount for current month
  monthlyIncome: number; // Actual income received from RTs
  rtPaymentStatus: RTPaymentStatus[];
  rtTotalBills: RTTotalBill[]; // New: RT total bills for collectors
}

export interface RTPaymentStatus {
  rt: string;
  totalBill: number; // Total amount owed by this RT
  paidAmount: number; // Amount already received from this RT
  pendingAmount: number; // Outstanding amount
  lastPaymentDate?: string;
  paymentStatus: 'paid' | 'partial' | 'pending';
}

export interface RTTotalBill {
  rt: string;
  customerCount: number;
  totalUsage: number; // Total m³ for this RT
  totalBill: number; // Total amount to collect
  averageBill: number; // Average bill per customer
  hasAllReadings: boolean; // Whether all customers have readings
  missingReadings: string[]; // Names of customers without readings
}

// Re-export financial types for convenience
export * from './financial';