/**
 * Mock Service for Demo Mode
 * Provides realistic mock data when API credentials are not configured
 */

export interface MockUserProfile {
  userId: string;
  name: string;
  measurements: {
    height: number;
    weight: number;
    chest: number;
    waist: number;
    hips: number;
  };
  preferences: {
    favoriteColors: string[];
    preferredBrands: string[];
    preferredStyles: string[];
    preferredSizes: string[];
  };
}

export interface MockProduct {
  id: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  imageUrl: string;
  sizes: string[];
  colors: string[];
  returnRate: number;
}

export interface MockSizePrediction {
  recommendedSize: string;
  confidence: number;
  fitScore: number;
  alternativeSizes: Array<{ size: string; confidence: number }>;
}

export interface MockReturnRisk {
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  factors: Array<{ factor: string; impact: number; description: string }>;
  recommendation: string;
}

class MockService {
  private mockUsers: Map<string, MockUserProfile> = new Map();
  private mockProducts: MockProduct[] = [];

  constructor() {
    this.initializeMockData();
  }

  private initializeMockData() {
    // Initialize mock user
    this.mockUsers.set('demo_user', {
      userId: 'demo_user',
      name: 'Demo User',
      measurements: {
        height: 170,
        weight: 65,
        chest: 90,
        waist: 75,
        hips: 95,
      },
      preferences: {
        favoriteColors: ['black', 'navy', 'white'],
        preferredBrands: ['Zara', 'H&M', 'Uniqlo'],
        preferredStyles: ['casual', 'minimalist'],
        preferredSizes: ['M', '8'],
      },
    });

    // Initialize mock products
    this.mockProducts = [
      {
        id: 'prod_1',
        name: 'Classic White T-Shirt',
        brand: 'Uniqlo',
        category: 'tops',
        price: 29.99,
        imageUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab',
        sizes: ['XS', 'S', 'M', 'L', 'XL'],
        colors: ['white', 'black', 'navy'],
        returnRate: 0.12,
      },
      {
        id: 'prod_2',
        name: 'Slim Fit Jeans',
        brand: 'Zara',
        category: 'bottoms',
        price: 59.99,
        imageUrl: 'https://images.unsplash.com/photo-1542272604-787c3835535d',
        sizes: ['28', '30', '32', '34', '36'],
        colors: ['blue', 'black'],
        returnRate: 0.25,
      },
      {
        id: 'prod_3',
        name: 'Summer Dress',
        brand: 'H&M',
        category: 'dresses',
        price: 49.99,
        imageUrl: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8',
        sizes: ['XS', 'S', 'M', 'L'],
        colors: ['red', 'blue', 'floral'],
        returnRate: 0.18,
      },
    ];
  }

  getUserProfile(userId: string): MockUserProfile | null {
    return this.mockUsers.get(userId) || this.mockUsers.get('demo_user') || null;
  }

  getProducts(filters?: { category?: string; brand?: string }): MockProduct[] {
    let products = [...this.mockProducts];
    
    if (filters?.category) {
      products = products.filter(p => p.category === filters.category);
    }
    
    if (filters?.brand) {
      products = products.filter(p => p.brand === filters.brand);
    }
    
    return products;
  }

  predictSize(userId: string, productId: string): MockSizePrediction {
    const user = this.getUserProfile(userId);
    const product = this.mockProducts.find(p => p.id === productId);
    
    if (!user || !product) {
      return {
        recommendedSize: 'M',
        confidence: 0.5,
        fitScore: 0.5,
        alternativeSizes: [],
      };
    }

    // Simple mock logic based on user measurements
    let recommendedSize = 'M';
    let confidence = 0.85;
    
    if (product.category === 'tops') {
      if (user.measurements.chest < 85) {
        recommendedSize = 'S';
        confidence = 0.92;
      } else if (user.measurements.chest > 95) {
        recommendedSize = 'L';
        confidence = 0.88;
      }
    } else if (product.category === 'bottoms') {
      if (user.measurements.waist < 70) {
        recommendedSize = '28';
        confidence = 0.90;
      } else if (user.measurements.waist > 80) {
        recommendedSize = '34';
        confidence = 0.87;
      } else {
        recommendedSize = '32';
        confidence = 0.91;
      }
    }

    return {
      recommendedSize,
      confidence,
      fitScore: confidence,
      alternativeSizes: [
        { size: recommendedSize, confidence },
        { size: 'L', confidence: confidence - 0.15 },
      ],
    };
  }

  assessReturnRisk(userId: string, productId: string): MockReturnRisk {
    const user = this.getUserProfile(userId);
    const product = this.mockProducts.find(p => p.id === productId);
    const sizePrediction = this.predictSize(userId, productId);
    
    if (!user || !product) {
      return {
        riskScore: 0.5,
        riskLevel: 'medium',
        factors: [],
        recommendation: 'Unable to assess risk',
      };
    }

    // Calculate risk based on multiple factors
    const fitConfidence = sizePrediction.confidence;
    const productReturnRate = product.returnRate;
    const styleMatch = user.preferences.preferredBrands.includes(product.brand) ? 0.9 : 0.6;
    
    const riskScore = (
      (1 - fitConfidence) * 0.4 +
      productReturnRate * 0.3 +
      (1 - styleMatch) * 0.3
    );
    
    let riskLevel: 'low' | 'medium' | 'high';
    if (riskScore < 0.3) riskLevel = 'low';
    else if (riskScore < 0.6) riskLevel = 'medium';
    else riskLevel = 'high';
    
    const factors = [
      {
        factor: 'Size Fit',
        impact: (1 - fitConfidence) * 100,
        description: `${(fitConfidence * 100).toFixed(0)}% confidence in size ${sizePrediction.recommendedSize}`,
      },
      {
        factor: 'Product Return Rate',
        impact: productReturnRate * 100,
        description: `This product has a ${(productReturnRate * 100).toFixed(0)}% return rate`,
      },
      {
        factor: 'Style Match',
        impact: (1 - styleMatch) * 100,
        description: styleMatch > 0.8 ? 'Matches your style preferences' : 'May not match your usual style',
      },
    ];
    
    let recommendation = '';
    if (riskLevel === 'low') {
      recommendation = 'Great choice! This item has a low return risk based on your profile.';
    } else if (riskLevel === 'medium') {
      recommendation = 'Consider checking the size guide carefully before purchasing.';
    } else {
      recommendation = 'High return risk. We recommend trying similar items with better fit confidence.';
    }
    
    return {
      riskScore,
      riskLevel,
      factors,
      recommendation,
    };
  }

  searchProducts(query: string): MockProduct[] {
    const lowerQuery = query.toLowerCase();
    return this.mockProducts.filter(p =>
      p.name.toLowerCase().includes(lowerQuery) ||
      p.brand.toLowerCase().includes(lowerQuery) ||
      p.category.toLowerCase().includes(lowerQuery)
    );
  }

  getTrendingProducts(): MockProduct[] {
    // Return products sorted by low return rate (trending = people keep them)
    return [...this.mockProducts].sort((a, b) => a.returnRate - b.returnRate);
  }
}

export const mockService = new MockService();
