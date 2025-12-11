/**
 * User Permission Tiers System
 * Manages FREE, PREMIUM, and VIP user permissions
 */

import type { UserProfile, UserPermissions, UserPermissionTier } from './types.js';
import { PermissionDeniedError } from './errors.js';
import { userMemory } from '../raindrop-config.js';
import { vultrPostgres } from '../vultr-postgres.js';

export class PermissionManager {
  /**
   * Get user permissions (with defaults)
   */
  async getUserPermissions(userId: string): Promise<UserPermissions> {
    try {
      // Try to get from database first
      const result = await vultrPostgres.query(
        `SELECT plan, preferences FROM users WHERE user_id = $1`,
        [userId]
      );

      if (result.rows && result.rows.length > 0) {
        const plan = result.rows[0].plan || 'free';
        const preferences = result.rows[0].preferences || {};
        
        return this.getPermissionsForTier(plan as UserPermissionTier, preferences);
      }
    } catch (error) {
      console.warn('Failed to get user permissions from database:', error);
    }

    // Fallback to SmartMemory
    try {
      const profile = await userMemory.get(userId);
      if (profile?.permissions) {
        return profile.permissions as UserPermissions;
      }
    } catch (error) {
      console.warn('Failed to get user permissions from SmartMemory:', error);
    }

    // Default to FREE tier
    return this.getPermissionsForTier('FREE');
  }

  /**
   * Get permissions for a specific tier
   */
  getPermissionsForTier(
    tier: UserPermissionTier,
    overrides?: Partial<UserPermissions>
  ): UserPermissions {
    const basePermissions: Record<UserPermissionTier, UserPermissions> = {
      FREE: {
        tier: 'FREE',
        autoPurchase: undefined, // No auto-purchase for free users
        autonomyLevel: 1, // Lowest autonomy
        approvedBrands: undefined,
        budgetCap: 100, // Lower budget cap
        maxAutoRefunds: 0, // No auto-refunds
      },
      PREMIUM: {
        tier: 'PREMIUM',
        autoPurchase: {
          max: 150,
          categories: ['clothing', 'accessories'],
        },
        autonomyLevel: 3, // Medium autonomy
        approvedBrands: undefined,
        budgetCap: 500,
        maxAutoRefunds: 2, // 2 auto-refunds per month
      },
      VIP: {
        tier: 'VIP',
        autoPurchase: {
          max: 1000,
          categories: ['clothing', 'accessories', 'shoes', 'jewelry'],
        },
        autonomyLevel: 5, // Highest autonomy
        approvedBrands: undefined,
        budgetCap: 2000,
        maxAutoRefunds: 5, // 5 auto-refunds per month
      },
    };

    return {
      ...basePermissions[tier],
      ...overrides,
    };
  }

  /**
   * Check if user has permission for an action
   */
  async checkPermission(
    userId: string,
    action: string,
    requiredTier?: UserPermissionTier
  ): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId);
    
    if (requiredTier) {
      const tierHierarchy: Record<UserPermissionTier, number> = {
        FREE: 1,
        PREMIUM: 2,
        VIP: 3,
      };
      
      const userTierLevel = tierHierarchy[permissions.tier];
      const requiredTierLevel = tierHierarchy[requiredTier];
      
      return userTierLevel >= requiredTierLevel;
    }

    // Check specific action permissions
    switch (action) {
      case 'autoPurchase':
        return permissions.autoPurchase !== undefined;
      case 'autoRefund':
        return (permissions.maxAutoRefunds || 0) > 0;
      default:
        return true; // Default allow for unknown actions
    }
  }

  /**
   * Require permission (throws if not allowed)
   */
  async requirePermission(
    userId: string,
    action: string,
    requiredTier?: UserPermissionTier
  ): Promise<void> {
    const hasPermission = await this.checkPermission(userId, action, requiredTier);
    
    if (!hasPermission) {
      const permissions = await this.getUserPermissions(userId);
      throw new PermissionDeniedError(
        action,
        requiredTier || 'PREMIUM',
        permissions.tier
      );
    }
  }

  /**
   * Update user tier
   */
  async updateUserTier(
    userId: string,
    tier: UserPermissionTier
  ): Promise<void> {
    const permissions = this.getPermissionsForTier(tier);
    
    // Update in database
    try {
      await vultrPostgres.query(
        `UPDATE users SET plan = $1, updated_at = $2 WHERE user_id = $3`,
        [tier.toLowerCase(), new Date().toISOString(), userId]
      );
    } catch (error) {
      console.error('Failed to update user tier in database:', error);
    }

    // Update in SmartMemory
    try {
      const profile = await userMemory.get(userId);
      await userMemory.set(userId, {
        ...profile,
        permissions,
      });
    } catch (error) {
      console.error('Failed to update user tier in SmartMemory:', error);
    }
  }

  /**
   * Get user profile with permissions
   */
  async getUserProfileWithPermissions(userId: string): Promise<UserProfile> {
    const permissions = await this.getUserPermissions(userId);
    
    // Get base profile
    let profile: any = {};
    try {
      profile = await userMemory.get(userId);
    } catch (error) {
      console.warn('Failed to get user profile from SmartMemory:', error);
    }

    // Get from database for additional fields
    try {
      const result = await vultrPostgres.query(
        `SELECT email, first_name, last_name, preferences, body_measurements 
         FROM user_profiles WHERE user_id = $1`,
        [userId]
      );

      if (result.rows && result.rows.length > 0) {
        const row = result.rows[0];
        profile = {
          ...profile,
          email: row.email,
          preferences: row.preferences || profile.preferences,
          bodyMeasurements: row.body_measurements || profile.bodyMeasurements,
        };
      }
    } catch (error) {
      console.warn('Failed to get user profile from database:', error);
    }

    return {
      userId,
      permissions,
      ...profile,
    } as UserProfile;
  }

  /**
   * Increment auto-refund count for user
   */
  async incrementAutoRefundCount(userId: string): Promise<void> {
    const profile = await this.getUserProfileWithPermissions(userId);
    const permissions = profile.permissions || await this.getUserPermissions(userId);
    
    const now = new Date();
    const resetDate = profile.autoRefundResetDate;
    
    // Reset if new month
    let count = 0;
    if (!resetDate || 
        now.getMonth() !== resetDate.getMonth() || 
        now.getFullYear() !== resetDate.getFullYear()) {
      count = 1;
    } else {
      count = (profile.autoRefundCount || 0) + 1;
    }

    // Update in SmartMemory
    try {
      await userMemory.set(userId, {
        ...profile,
        autoRefundCount: count,
        autoRefundResetDate: now,
      });
    } catch (error) {
      console.error('Failed to update auto-refund count:', error);
    }
  }
}

// Singleton instance
export const permissionManager = new PermissionManager();
