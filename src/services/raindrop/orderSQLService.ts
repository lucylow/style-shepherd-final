/**
 * SmartSQL Service - Structured Data Management
 * 
 * Manages orders, catalog, and returns data using Raindrop SmartSQL.
 */

import { orderSQL } from '@/integrations/raindrop/config';

export interface Order {
  id: string;
  user_id: string;
  items: Array<{
    productId: string;
    quantity: number;
    price: number;
    size?: string;
    color?: string;
  }>;
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'returned' | 'cancelled';
  predicted_return_rate?: number;
  created_at: string;
  updated_at?: string;
}

export interface ReturnRecord {
  id: string;
  order_id: string;
  product_id: string;
  user_id: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  created_at: string;
}

export interface ProductCatalog {
  id: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  brand?: string;
  color?: string;
  sizes?: string[];
  stock: number;
  created_at: string;
  updated_at?: string;
}

class OrderSQLService {
  /**
   * Create a new order
   */
  async createOrder(order: Omit<Order, 'id' | 'created_at'>): Promise<Order> {
    const orderId = `order-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newOrder: Order = {
      ...order,
      id: orderId,
      created_at: new Date().toISOString(),
    };
    
    await orderSQL.insert('orders', newOrder);
    return newOrder;
  }

  /**
   * Get order by ID
   */
  async getOrder(orderId: string): Promise<Order | null> {
    try {
      const results = await orderSQL.query(
        'SELECT * FROM orders WHERE id = ?',
        [orderId]
      );
      return results[0] || null;
    } catch (error) {
      console.error('Failed to get order:', error);
      return null;
    }
  }

  /**
   * Get user orders
   */
  async getUserOrders(userId: string, limit?: number): Promise<Order[]> {
    try {
      const sql = limit 
        ? 'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT ?'
        : 'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC';
      const params = limit ? [userId, limit] : [userId];
      return await orderSQL.query(sql, params);
    } catch (error) {
      console.error('Failed to get user orders:', error);
      return [];
    }
  }

  /**
   * Update order status
   */
  async updateOrderStatus(orderId: string, status: Order['status']): Promise<void> {
    await orderSQL.update('orders', orderId, {
      status,
      updated_at: new Date().toISOString(),
    });
  }

  /**
   * Create return record
   */
  async createReturn(returnRecord: Omit<ReturnRecord, 'id' | 'created_at'>): Promise<ReturnRecord> {
    const returnId = `return-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newReturn: ReturnRecord = {
      ...returnRecord,
      id: returnId,
      created_at: new Date().toISOString(),
    };
    
    await orderSQL.insert('returns', newReturn);
    return newReturn;
  }

  /**
   * Get return records for user
   */
  async getUserReturns(userId: string): Promise<ReturnRecord[]> {
    try {
      return await orderSQL.query(
        'SELECT * FROM returns WHERE user_id = ? ORDER BY created_at DESC',
        [userId]
      );
    } catch (error) {
      console.error('Failed to get user returns:', error);
      return [];
    }
  }

  /**
   * Get return analytics
   */
  async getReturnAnalytics(userId?: string): Promise<{
    totalReturns: number;
    returnRate: number;
    avgReturnRate: number;
    topReturnReasons: Array<{ reason: string; count: number }>;
  }> {
    try {
      const sql = userId
        ? 'SELECT COUNT(*), AVG(predicted_return_rate) FROM orders WHERE user_id = ?'
        : 'SELECT COUNT(*), AVG(predicted_return_rate) FROM orders';
      const params = userId ? [userId] : [];
      const [stats] = await orderSQL.query(sql, params);
      
      const returns = userId
        ? await orderSQL.query('SELECT reason, COUNT(*) as count FROM returns WHERE user_id = ? GROUP BY reason ORDER BY count DESC LIMIT 5', [userId])
        : await orderSQL.query('SELECT reason, COUNT(*) as count FROM returns GROUP BY reason ORDER BY count DESC LIMIT 5', []);
      
      return {
        totalReturns: stats?.['COUNT(*)'] || 0,
        returnRate: stats?.['AVG(predicted_return_rate)'] || 0,
        avgReturnRate: stats?.['AVG(predicted_return_rate)'] || 0,
        topReturnReasons: returns.map((r: any) => ({
          reason: r.reason,
          count: r.count,
        })),
      };
    } catch (error) {
      console.error('Failed to get return analytics:', error);
      return {
        totalReturns: 0,
        returnRate: 0,
        avgReturnRate: 0,
        topReturnReasons: [],
      };
    }
  }

  /**
   * Add product to catalog
   */
  async addProductToCatalog(product: Omit<ProductCatalog, 'id' | 'created_at'>): Promise<ProductCatalog> {
    const productId = `product-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newProduct: ProductCatalog = {
      ...product,
      id: productId,
      created_at: new Date().toISOString(),
    };
    
    await orderSQL.insert('catalog', newProduct);
    return newProduct;
  }

  /**
   * Query products from catalog
   */
  async queryProducts(query: string, params?: any[]): Promise<ProductCatalog[]> {
    try {
      return await orderSQL.query(query, params || []);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[OrderSQLService] Failed to query products:`, errorMessage);
      return [];
    }
  }

  /**
   * Get return prediction data for a user and product
   * Queries SmartSQL for user and product data needed for return prediction models
   */
  async getReturnPredictionData(userId: string, productId: string): Promise<{
    userData: {
      returnRate: number;
      avgOrderValue: number;
      preferredSizes: string[];
      preferredBrands: string[];
      orderCount: number;
    };
    productData: {
      returnRate: number;
      avgRating: number;
      reviewCount: number;
      category: string;
      brand: string;
      price: number;
    };
    historicalData: {
      userProductReturns: number;
      similarProductReturns: number;
    };
  }> {
    try {
      // Get user return statistics
      const userStats = await orderSQL.query(
        `SELECT 
          COUNT(CASE WHEN status = 'returned' THEN 1 END) * 1.0 / NULLIF(COUNT(*), 0) as return_rate,
          AVG(total) as avg_order_value,
          COUNT(*) as order_count
        FROM orders 
        WHERE user_id = ?`,
        [userId]
      );

      // Get user preferences from orders
      const userPreferences = await orderSQL.query(
        `SELECT DISTINCT 
          items->>'$.size' as size,
          items->>'$.brand' as brand
        FROM orders 
        WHERE user_id = ? 
        LIMIT 20`,
        [userId]
      );

      // Get product statistics
      const productStats = await orderSQL.query(
        `SELECT 
          category,
          brand,
          price,
          (SELECT COUNT(CASE WHEN status = 'returned' THEN 1 END) * 1.0 / NULLIF(COUNT(*), 0)
           FROM orders o 
           WHERE EXISTS (
             SELECT 1 FROM JSON_TABLE(o.items, '$[*]' COLUMNS (product_id VARCHAR(255) PATH '$.productId')) jt
             WHERE jt.product_id = ?
           )) as return_rate
        FROM catalog 
        WHERE id = ?`,
        [productId, productId]
      );

      // Get historical return data
      const historicalReturns = await orderSQL.query(
        `SELECT 
          COUNT(*) as user_product_returns
        FROM returns r
        JOIN orders o ON r.order_id = o.id
        WHERE r.user_id = ? AND r.product_id = ?`,
        [userId, productId]
      );

      const similarProductReturns = await orderSQL.query(
        `SELECT COUNT(*) as similar_returns
        FROM returns r
        JOIN orders o ON r.order_id = o.id
        JOIN catalog c ON r.product_id = c.id
        WHERE c.category = (
          SELECT category FROM catalog WHERE id = ?
        ) AND r.user_id = ?`,
        [productId, userId]
      );

      const userStat = userStats[0] || {};
      const productStat = productStats[0] || {};
      const historicalReturn = historicalReturns[0] || {};
      const similarReturn = similarProductReturns[0] || {};

      return {
        userData: {
          returnRate: userStat.return_rate || 0,
          avgOrderValue: userStat.avg_order_value || 0,
          preferredSizes: [...new Set(userPreferences.map((p: any) => p.size).filter(Boolean))],
          preferredBrands: [...new Set(userPreferences.map((p: any) => p.brand).filter(Boolean))],
          orderCount: userStat.order_count || 0,
        },
        productData: {
          returnRate: productStat.return_rate || 0,
          avgRating: 0, // Would need reviews table
          reviewCount: 0, // Would need reviews table
          category: productStat.category || 'unknown',
          brand: productStat.brand || 'unknown',
          price: productStat.price || 0,
        },
        historicalData: {
          userProductReturns: historicalReturn.user_product_returns || 0,
          similarProductReturns: similarReturn.similar_returns || 0,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[OrderSQLService] Failed to get return prediction data for user ${userId}, product ${productId}:`, errorMessage);
      // Return default structure on error
      return {
        userData: {
          returnRate: 0,
          avgOrderValue: 0,
          preferredSizes: [],
          preferredBrands: [],
          orderCount: 0,
        },
        productData: {
          returnRate: 0,
          avgRating: 0,
          reviewCount: 0,
          category: 'unknown',
          brand: 'unknown',
          price: 0,
        },
        historicalData: {
          userProductReturns: 0,
          similarProductReturns: 0,
        },
      };
    }
  }

  /**
   * Get dashboard analytics with business intelligence queries
   * Performs aggregation queries on SmartSQL to provide data for BI dashboard
   */
  async getDashboardAnalytics(): Promise<{
    totalSales: number;
    totalOrders: number;
    returnRate: number;
    returnRatesByCategory: Array<{ category: string; returnRate: number; orderCount: number }>;
    topReturnReasons: Array<{ reason: string; count: number; percentage: number }>;
    salesByCategory: Array<{ category: string; sales: number; orderCount: number }>;
    averageOrderValue: number;
    returnRateByBrand: Array<{ brand: string; returnRate: number; orderCount: number }>;
    recentTrends: {
      dailySales: Array<{ date: string; sales: number; orders: number }>;
      dailyReturns: Array<{ date: string; returns: number }>;
    };
  }> {
    try {
      // Total sales and orders
      const salesStats = await orderSQL.query(
        `SELECT 
          SUM(total) as total_sales,
          COUNT(*) as total_orders,
          AVG(total) as avg_order_value,
          COUNT(CASE WHEN status = 'returned' THEN 1 END) * 1.0 / NULLIF(COUNT(*), 0) as return_rate
        FROM orders`
      );

      // Return rates by category
      const categoryReturns = await orderSQL.query(
        `SELECT 
          c.category,
          COUNT(CASE WHEN o.status = 'returned' THEN 1 END) * 1.0 / NULLIF(COUNT(o.id), 0) as return_rate,
          COUNT(o.id) as order_count
        FROM orders o
        JOIN catalog c ON JSON_EXTRACT(o.items, '$[0].productId') = c.id
        GROUP BY c.category
        ORDER BY order_count DESC
        LIMIT 10`
      );

      // Top return reasons
      const returnReasons = await orderSQL.query(
        `SELECT 
          reason,
          COUNT(*) as count,
          COUNT(*) * 100.0 / (SELECT COUNT(*) FROM returns) as percentage
        FROM returns
        GROUP BY reason
        ORDER BY count DESC
        LIMIT 10`
      );

      // Sales by category
      const salesByCategory = await orderSQL.query(
        `SELECT 
          c.category,
          SUM(o.total) as sales,
          COUNT(o.id) as order_count
        FROM orders o
        JOIN catalog c ON JSON_EXTRACT(o.items, '$[0].productId') = c.id
        GROUP BY c.category
        ORDER BY sales DESC
        LIMIT 10`
      );

      // Return rates by brand
      const brandReturns = await orderSQL.query(
        `SELECT 
          c.brand,
          COUNT(CASE WHEN o.status = 'returned' THEN 1 END) * 1.0 / NULLIF(COUNT(o.id), 0) as return_rate,
          COUNT(o.id) as order_count
        FROM orders o
        JOIN catalog c ON JSON_EXTRACT(o.items, '$[0].productId') = c.id
        WHERE c.brand IS NOT NULL
        GROUP BY c.brand
        HAVING order_count >= 5
        ORDER BY return_rate DESC
        LIMIT 10`
      );

      // Recent trends (last 30 days)
      const dailySales = await orderSQL.query(
        `SELECT 
          DATE(created_at) as date,
          SUM(total) as sales,
          COUNT(*) as orders
        FROM orders
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY DATE(created_at)
        ORDER BY date DESC`
      );

      const dailyReturns = await orderSQL.query(
        `SELECT 
          DATE(created_at) as date,
          COUNT(*) as returns
        FROM returns
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY DATE(created_at)
        ORDER BY date DESC`
      );

      const stats = salesStats[0] || {};

      return {
        totalSales: stats.total_sales || 0,
        totalOrders: stats.total_orders || 0,
        returnRate: stats.return_rate || 0,
        returnRatesByCategory: categoryReturns.map((r: any) => ({
          category: r.category || 'unknown',
          returnRate: r.return_rate || 0,
          orderCount: r.order_count || 0,
        })),
        topReturnReasons: returnReasons.map((r: any) => ({
          reason: r.reason || 'unknown',
          count: r.count || 0,
          percentage: r.percentage || 0,
        })),
        salesByCategory: salesByCategory.map((s: any) => ({
          category: s.category || 'unknown',
          sales: s.sales || 0,
          orderCount: s.order_count || 0,
        })),
        averageOrderValue: stats.avg_order_value || 0,
        returnRateByBrand: brandReturns.map((b: any) => ({
          brand: b.brand || 'unknown',
          returnRate: b.return_rate || 0,
          orderCount: b.order_count || 0,
        })),
        recentTrends: {
          dailySales: dailySales.map((d: any) => ({
            date: d.date || '',
            sales: d.sales || 0,
            orders: d.orders || 0,
          })),
          dailyReturns: dailyReturns.map((d: any) => ({
            date: d.date || '',
            returns: d.returns || 0,
          })),
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[OrderSQLService] Failed to get dashboard analytics:`, errorMessage);
      // Return default structure on error
      return {
        totalSales: 0,
        totalOrders: 0,
        returnRate: 0,
        returnRatesByCategory: [],
        topReturnReasons: [],
        salesByCategory: [],
        averageOrderValue: 0,
        returnRateByBrand: [],
        recentTrends: {
          dailySales: [],
          dailyReturns: [],
        },
      };
    }
  }
}

export const orderSQLService = new OrderSQLService();

