/**
 * Vultr Management API Integration
 * Uses official @vultr/vultr-node SDK for infrastructure management and monitoring
 */

import VultrNode from '@vultr/vultr-node';
import env from '../../config/env.js';

export interface VultrDatabaseInfo {
  id: string;
  label: string;
  region: string;
  database_engine: string;
  database_engine_version: string;
  status: string;
  host: string;
  port: number;
  user: string;
  maintenance_dow: string;
  maintenance_time: string;
  latest_backup?: string;
  trusted_ips?: string[];
  cluster_time_zone?: string;
  read_replicas?: any[];
}

export interface VultrValkeyInfo {
  id: string;
  label: string;
  region: string;
  status: string;
  host: string;
  port: number;
  maintenance_dow: string;
  maintenance_time: string;
  redis_command_stats?: boolean;
  eviction_policy?: string;
}

export interface VultrInstanceInfo {
  id: string;
  label: string;
  region: string;
  plan: string;
  status: string;
  power_status: string;
  server_status: string;
  main_ip: string;
  vcpu_count: number;
  ram: number;
  disk: number;
  disk_count: number;
  cost_per_month: number;
  created_at: string;
  allowed_bandwidth: number;
  netmask_v4: string;
  gateway_v4: string;
}

class VultrManagementService {
  private client: any;
  private apiKey: string | null = null;

  constructor() {
    // Get Vultr API key from environment
    this.apiKey = 
      process.env.VULTR_API_KEY || 
      process.env.VULTR_MANAGEMENT_API_KEY || 
      null;

    if (this.apiKey) {
      try {
        this.client = VultrNode.initialize({
          apiKey: this.apiKey,
          baseUrl: 'https://api.vultr.com/v2',
          rateLimit: 600, // 600 requests per minute
        });
      } catch (error) {
        console.warn('Failed to initialize Vultr Management API client', error);
        this.client = null;
      }
    } else {
      console.warn('VULTR_API_KEY or VULTR_MANAGEMENT_API_KEY not found. Management API features disabled.');
      this.client = null;
    }
  }

  /**
   * Check if Management API is available
   */
  isAvailable(): boolean {
    return this.client !== null && this.apiKey !== null;
  }

  /**
   * Get account information
   */
  async getAccountInfo(): Promise<any> {
    if (!this.isAvailable()) {
      throw new Error('Vultr Management API is not available');
    }

    try {
      return await this.client.account.getAccountInfo();
    } catch (error: any) {
      console.error('Failed to get Vultr account info', error);
      throw new Error(`Vultr API error: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * List all managed databases
   */
  async listDatabases(): Promise<VultrDatabaseInfo[]> {
    if (!this.isAvailable()) {
      throw new Error('Vultr Management API is not available');
    }

    try {
      const response = await this.client.database.listDatabases();
      return response.databases || [];
    } catch (error: any) {
      console.error('Failed to list Vultr databases', error);
      throw new Error(`Vultr API error: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Get specific database information
   */
  async getDatabase(databaseId: string): Promise<VultrDatabaseInfo | null> {
    if (!this.isAvailable()) {
      throw new Error('Vultr Management API is not available');
    }

    try {
      const databases = await this.listDatabases();
      return databases.find(db => db.id === databaseId) || null;
    } catch (error: any) {
      console.error(`Failed to get Vultr database ${databaseId}`, error);
      return null;
    }
  }

  /**
   * Find PostgreSQL database by host or label
   */
  async findPostgresDatabase(host?: string, label?: string): Promise<VultrDatabaseInfo | null> {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const databases = await this.listDatabases();
      
      if (host) {
        const found = databases.find(db => 
          db.host === host && db.database_engine === 'postgresql'
        );
        if (found) return found;
      }
      
      if (label) {
        const found = databases.find(db => 
          db.label === label && db.database_engine === 'postgresql'
        );
        if (found) return found;
      }
      
      // Return first PostgreSQL database if no specific match
      return databases.find(db => db.database_engine === 'postgresql') || null;
    } catch (error: any) {
      console.error('Failed to find PostgreSQL database', error);
      return null;
    }
  }

  /**
   * List all Valkey instances
   */
  async listValkeyInstances(): Promise<VultrValkeyInfo[]> {
    if (!this.isAvailable()) {
      throw new Error('Vultr Management API is not available');
    }

    try {
      // Note: Valkey might be under databases or a separate endpoint
      // Adjust based on actual Vultr API structure
      const response = await this.client.database.listDatabases();
      return (response.databases || []).filter(
        (db: any) => db.database_engine === 'valkey' || db.database_engine === 'redis'
      );
    } catch (error: any) {
      console.error('Failed to list Vultr Valkey instances', error);
      throw new Error(`Vultr API error: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Get database metrics and health
   */
  async getDatabaseHealth(databaseId: string): Promise<{
    status: string;
    uptime?: number;
    connections?: number;
    queries_per_second?: number;
    cpu_usage?: number;
    memory_usage?: number;
    disk_usage?: number;
  }> {
    if (!this.isAvailable()) {
      throw new Error('Vultr Management API is not available');
    }

    try {
      const database = await this.getDatabase(databaseId);
      if (!database) {
        throw new Error(`Database ${databaseId} not found`);
      }

      // Get metrics (adjust endpoint based on actual Vultr API)
      // This is a placeholder - actual implementation depends on Vultr API structure
      return {
        status: database.status,
        // Additional metrics would come from Vultr metrics API
      };
    } catch (error: any) {
      console.error(`Failed to get database health for ${databaseId}`, error);
      throw error;
    }
  }

  /**
   * List compute instances
   */
  async listInstances(): Promise<VultrInstanceInfo[]> {
    if (!this.isAvailable()) {
      throw new Error('Vultr Management API is not available');
    }

    try {
      const response = await this.client.instances.listInstances();
      return response.instances || [];
    } catch (error: any) {
      console.error('Failed to list Vultr instances', error);
      throw new Error(`Vultr API error: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Get instance by ID
   */
  async getInstance(instanceId: string): Promise<VultrInstanceInfo | null> {
    if (!this.isAvailable()) {
      throw new Error('Vultr Management API is not available');
    }

    try {
      const instances = await this.listInstances();
      return instances.find(inst => inst.id === instanceId) || null;
    } catch (error: any) {
      console.error(`Failed to get Vultr instance ${instanceId}`, error);
      return null;
    }
  }

  /**
   * Get infrastructure summary
   */
  async getInfrastructureSummary(): Promise<{
    databases: number;
    valkeyInstances: number;
    computeInstances: number;
    totalMonthlyCost?: number;
  }> {
    if (!this.isAvailable()) {
      return {
        databases: 0,
        valkeyInstances: 0,
        computeInstances: 0,
      };
    }

    try {
      const [databases, valkeyInstances, instances] = await Promise.all([
        this.listDatabases(),
        this.listValkeyInstances(),
        this.listInstances(),
      ]);

      const totalMonthlyCost = instances.reduce(
        (sum, inst) => sum + (inst.cost_per_month || 0),
        0
      );

      return {
        databases: databases.length,
        valkeyInstances: valkeyInstances.length,
        computeInstances: instances.length,
        totalMonthlyCost,
      };
    } catch (error: any) {
      console.error('Failed to get infrastructure summary', error);
      return {
        databases: 0,
        valkeyInstances: 0,
        computeInstances: 0,
      };
    }
  }
}

export const vultrManagement = new VultrManagementService();
