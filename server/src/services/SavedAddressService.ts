/**
 * Saved Address Service - Manage user shipping addresses
 */

import { vultrPostgres } from '../lib/vultr-postgres.js';
import {
  BusinessLogicError,
  NotFoundError,
  DatabaseError,
  ErrorCode,
} from '../lib/errors.js';

export interface SavedAddress {
  addressId: string;
  userId: string;
  label?: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class SavedAddressService {
  /**
   * Get user's saved addresses
   */
  async getAddresses(userId: string): Promise<SavedAddress[]> {
    try {
      const result = await vultrPostgres.query<SavedAddress>(
        `SELECT address_id as "addressId", user_id as "userId", label, name, address,
         city, state, zip_code as "zipCode", country, is_default as "isDefault",
         created_at as "createdAt", updated_at as "updatedAt"
         FROM saved_addresses 
         WHERE user_id = $1 
         ORDER BY is_default DESC, created_at DESC`,
        [userId]
      );

      return result.rows.map(row => ({
        ...row,
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
      }));
    } catch (error: any) {
      throw new DatabaseError(
        `Failed to get addresses: ${error.message}`,
        ErrorCode.DATABASE_ERROR,
        error
      );
    }
  }

  /**
   * Get default address
   */
  async getDefaultAddress(userId: string): Promise<SavedAddress | null> {
    try {
      const result = await vultrPostgres.query<SavedAddress>(
        `SELECT address_id as "addressId", user_id as "userId", label, name, address,
         city, state, zip_code as "zipCode", country, is_default as "isDefault",
         created_at as "createdAt", updated_at as "updatedAt"
         FROM saved_addresses 
         WHERE user_id = $1 AND is_default = true 
         LIMIT 1`,
        [userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        ...row,
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
      };
    } catch (error: any) {
      throw new DatabaseError(
        `Failed to get default address: ${error.message}`,
        ErrorCode.DATABASE_ERROR,
        error
      );
    }
  }

  /**
   * Add saved address
   */
  async addAddress(
    userId: string,
    address: Omit<SavedAddress, 'addressId' | 'userId' | 'createdAt' | 'updatedAt' | 'isDefault'> & { isDefault?: boolean }
  ): Promise<SavedAddress> {
    try {
      const addressId = `addr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const isDefault = address.isDefault ?? false;

      // If setting as default, unset other defaults
      if (isDefault) {
        await vultrPostgres.query(
          'UPDATE saved_addresses SET is_default = false WHERE user_id = $1',
          [userId]
        );
      }

      await vultrPostgres.query(
        `INSERT INTO saved_addresses (address_id, user_id, label, name, address, city, state, zip_code, country, is_default, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          addressId,
          userId,
          address.label || null,
          address.name,
          address.address,
          address.city,
          address.state,
          address.zipCode,
          address.country || 'US',
          isDefault,
          new Date().toISOString(),
          new Date().toISOString(),
        ]
      );

      return {
        addressId,
        userId,
        label: address.label,
        name: address.name,
        address: address.address,
        city: address.city,
        state: address.state,
        zipCode: address.zipCode,
        country: address.country || 'US',
        isDefault,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    } catch (error: any) {
      throw new DatabaseError(
        `Failed to add address: ${error.message}`,
        ErrorCode.DATABASE_ERROR,
        error
      );
    }
  }

  /**
   * Update saved address
   */
  async updateAddress(
    userId: string,
    addressId: string,
    updates: Partial<Omit<SavedAddress, 'addressId' | 'userId' | 'createdAt' | 'updatedAt'>>
  ): Promise<SavedAddress> {
    try {
      // If setting as default, unset other defaults
      if (updates.isDefault) {
        await vultrPostgres.query(
          'UPDATE saved_addresses SET is_default = false WHERE user_id = $1 AND address_id != $2',
          [userId, addressId]
        );
      }

      const setClause: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (updates.label !== undefined) {
        setClause.push(`label = $${paramIndex++}`);
        values.push(updates.label);
      }
      if (updates.name !== undefined) {
        setClause.push(`name = $${paramIndex++}`);
        values.push(updates.name);
      }
      if (updates.address !== undefined) {
        setClause.push(`address = $${paramIndex++}`);
        values.push(updates.address);
      }
      if (updates.city !== undefined) {
        setClause.push(`city = $${paramIndex++}`);
        values.push(updates.city);
      }
      if (updates.state !== undefined) {
        setClause.push(`state = $${paramIndex++}`);
        values.push(updates.state);
      }
      if (updates.zipCode !== undefined) {
        setClause.push(`zip_code = $${paramIndex++}`);
        values.push(updates.zipCode);
      }
      if (updates.country !== undefined) {
        setClause.push(`country = $${paramIndex++}`);
        values.push(updates.country);
      }
      if (updates.isDefault !== undefined) {
        setClause.push(`is_default = $${paramIndex++}`);
        values.push(updates.isDefault);
      }

      if (setClause.length === 0) {
        throw new BusinessLogicError('No updates provided', ErrorCode.VALIDATION_ERROR);
      }

      setClause.push(`updated_at = $${paramIndex++}`);
      values.push(new Date().toISOString());

      values.push(addressId, userId);

      const result = await vultrPostgres.query(
        `UPDATE saved_addresses 
         SET ${setClause.join(', ')}
         WHERE address_id = $${paramIndex} AND user_id = $${paramIndex + 1}`,
        values
      );

      if (result.rowCount === 0) {
        throw new NotFoundError('Address not found', ErrorCode.NOT_FOUND);
      }

      // Return updated address
      const addresses = await this.getAddresses(userId);
      const updated = addresses.find(a => a.addressId === addressId);
      if (!updated) {
        throw new NotFoundError('Address not found after update', ErrorCode.NOT_FOUND);
      }
      return updated;
    } catch (error: any) {
      if (error instanceof BusinessLogicError || error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError(
        `Failed to update address: ${error.message}`,
        ErrorCode.DATABASE_ERROR,
        error
      );
    }
  }

  /**
   * Delete saved address
   */
  async deleteAddress(userId: string, addressId: string): Promise<void> {
    try {
      const result = await vultrPostgres.query(
        'DELETE FROM saved_addresses WHERE address_id = $1 AND user_id = $2',
        [addressId, userId]
      );

      if (result.rowCount === 0) {
        throw new NotFoundError('Address not found', ErrorCode.NOT_FOUND);
      }
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError(
        `Failed to delete address: ${error.message}`,
        ErrorCode.DATABASE_ERROR,
        error
      );
    }
  }
}

export const savedAddressService = new SavedAddressService();
