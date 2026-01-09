/**
 * Role-based Access Control Service
 * Manages user roles and permissions for RT PIC system
 */

import { supabase } from './supabase';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  role: 'admin' | 'rt_pic' | 'collector';
  assigned_rt?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserPermissions {
  canManageUsers: boolean;
  canManageDiscounts: boolean;
  canViewAllCustomers: boolean;
  canViewAllReports: boolean;
  canInputMeterReadings: boolean;
  canManageFinancial: boolean;
  assignedRTs: string[];
}

export class RoleService {
  private userProfile: UserProfile | null = null;
  private permissions: UserPermissions | null = null;

  /**
   * Initialize user profile and permissions
   */
  async initializeUser(email: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('email', email)
        .eq('is_active', true)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        return null;
      }

      this.userProfile = data;
      this.permissions = this.calculatePermissions(data);
      
      return data;
    } catch (error) {
      console.error('Error initializing user:', error);
      return null;
    }
  }

  /**
   * Calculate user permissions based on role
   */
  private calculatePermissions(profile: UserProfile): UserPermissions {
    const basePermissions: UserPermissions = {
      canManageUsers: false,
      canManageDiscounts: false,
      canViewAllCustomers: false,
      canViewAllReports: false,
      canInputMeterReadings: false,
      canManageFinancial: false,
      assignedRTs: []
    };

    switch (profile.role) {
      case 'admin':
        return {
          canManageUsers: true,
          canManageDiscounts: true,
          canViewAllCustomers: true,
          canViewAllReports: true,
          canInputMeterReadings: true,
          canManageFinancial: true,
          assignedRTs: [] // Admin can access all RTs
        };

      case 'rt_pic':
        return {
          ...basePermissions,
          canInputMeterReadings: true,
          canViewAllCustomers: false, // Only their RT
          canViewAllReports: false, // Only their RT
          assignedRTs: profile.assigned_rt ? [profile.assigned_rt] : []
        };

      case 'collector':
        return {
          ...basePermissions,
          canManageFinancial: true, // Can record payments
          canViewAllCustomers: false, // Only their RT
          assignedRTs: profile.assigned_rt ? [profile.assigned_rt] : []
        };

      default:
        return basePermissions;
    }
  }

  /**
   * Get current user profile
   */
  getUserProfile(): UserProfile | null {
    return this.userProfile;
  }

  /**
   * Get current user permissions
   */
  getPermissions(): UserPermissions | null {
    return this.permissions;
  }

  /**
   * Check if user has specific permission
   */
  hasPermission(permission: keyof UserPermissions): boolean {
    if (!this.permissions) return false;
    
    const value = this.permissions[permission];
    return typeof value === 'boolean' ? value : false;
  }

  /**
   * Check if user can access specific RT
   */
  canAccessRT(rt: string): boolean {
    if (!this.permissions) return false;
    
    // Admin can access all RTs
    if (this.userProfile?.role === 'admin') return true;
    
    // Check if RT is in assigned RTs
    return this.permissions.assignedRTs.includes(rt);
  }

  /**
   * Get customers filtered by user's RT access
   */
  async getAccessibleCustomers(): Promise<any[]> {
    try {
      let query = supabase.from('customers').select('*');

      // Filter by RT if not admin
      if (this.userProfile?.role !== 'admin' && this.permissions?.assignedRTs.length) {
        query = query.in('rt', this.permissions.assignedRTs);
      }

      const { data, error } = await query.order('name');

      if (error) {
        console.error('Error fetching accessible customers:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting accessible customers:', error);
      return [];
    }
  }

  /**
   * Get meter readings filtered by user's RT access
   */
  async getAccessibleReadings(startDate?: string, endDate?: string): Promise<any[]> {
    try {
      // First get accessible customers
      const customers = await this.getAccessibleCustomers();
      const customerIds = customers.map(c => c.id);

      if (customerIds.length === 0) return [];

      let query = supabase
        .from('meter_readings')
        .select(`
          *,
          customers!inner(id, name, rt, phone)
        `)
        .in('customer_id', customerIds);

      if (startDate) {
        query = query.gte('date', startDate);
      }
      if (endDate) {
        query = query.lte('date', endDate);
      }

      const { data, error } = await query.order('date', { ascending: false });

      if (error) {
        console.error('Error fetching accessible readings:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting accessible readings:', error);
      return [];
    }
  }

  /**
   * Check if user is admin
   */
  isAdmin(): boolean {
    return this.userProfile?.role === 'admin';
  }

  /**
   * Check if user is RT PIC
   */
  isRTPIC(): boolean {
    return this.userProfile?.role === 'rt_pic';
  }

  /**
   * Check if user is collector
   */
  isCollector(): boolean {
    return this.userProfile?.role === 'collector';
  }

  /**
   * Get user's assigned RT
   */
  getAssignedRT(): string | null {
    return this.userProfile?.assigned_rt || null;
  }

  /**
   * Clear user session
   */
  clearSession(): void {
    this.userProfile = null;
    this.permissions = null;
  }
}

// Export singleton instance
export const roleService = new RoleService();