/**
 * Guardrails Framework - Core Types
 * Defines types and interfaces for the multi-layered validation system
 */

export type AgentType = 
  | 'personalShopper' 
  | 'makeupArtist' 
  | 'sizePredictor' 
  | 'returnsPredictor'
  | 'cartAgent'
  | 'searchAgent';

export type GuardrailResult = {
  approved: boolean;
  reason?: string;
  warnings?: string[];
  modified?: any; // Modified action/payload if auto-corrected
  requiresApproval?: boolean;
};

export type GuardrailViolation = {
  agent: AgentType;
  action: string;
  userId?: string;
  reason: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  payload?: any;
  checkName: string;
};

export type UserPermissionTier = 'FREE' | 'PREMIUM' | 'VIP';

export interface UserPermissions {
  tier: UserPermissionTier;
  autoPurchase?: {
    max: number; // Max amount in dollars
    categories: string[];
  };
  autonomyLevel: number; // 1-5 scale
  approvedBrands?: string[];
  budgetCap?: number; // Max spending per bundle/transaction
  maxAutoRefunds?: number; // Max auto-refunds per month
}

export interface AgentAction {
  type: string;
  payload: any;
  agent: AgentType;
  userId?: string;
  timestamp?: Date;
}

export interface GuardrailCheck {
  name: string;
  validate: (payload: any, user: UserProfile) => Promise<boolean> | boolean;
  reason: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  autoCorrect?: (payload: any, user: UserProfile) => Promise<any> | any;
}

export interface UserProfile {
  userId: string;
  email?: string;
  age?: number;
  permissions?: UserPermissions;
  preferences?: {
    favoriteColors?: string[];
    preferredBrands?: string[];
    allergies?: string[];
    medicalFlags?: {
      pregnancy?: boolean;
      acne?: boolean;
      skinConditions?: string[];
    };
  };
  bodyMeasurements?: {
    height?: number;
    weight?: number;
    chest?: number;
    waist?: number;
    hips?: number;
  };
  returnHistory?: Array<{
    productId: string;
    reason?: string;
    date?: string;
  }>;
  autoRefundCount?: number; // Current month count
  autoRefundResetDate?: Date; // When to reset counter
}

export interface OutfitBundle {
  items: Array<{
    product: {
      id: string;
      name: string;
      brand: string;
      price: number;
      category?: string;
      ageRating?: string;
      inStock?: boolean;
      stock?: number;
    };
    quantity: number;
    size?: string;
  }>;
  total: number;
}

export interface MakeupRecommendation {
  products: Array<{
    productId: string;
    name: string;
    ingredients?: string[];
    shade?: string;
    fitzpatrickScale?: number;
    ageRating?: string;
  }>;
  routine: any;
}

export interface SizePrediction {
  recommendedSize: string;
  confidence: number;
  measurements?: {
    height?: number;
    weight?: number;
    chest?: number;
    waist?: number;
    hips?: number;
  };
}

export interface ReturnPrediction {
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  productId: string;
  userId?: string;
}

export interface CircuitBreakerState {
  agent: AgentType;
  isOpen: boolean;
  failureCount: number;
  lastFailureTime?: Date;
  openedAt?: Date;
  violationRate: number; // Percentage of actions that violate guardrails
}

export interface AuditLog {
  id: string;
  agent: AgentType;
  action: string;
  userId?: string;
  result: GuardrailResult;
  timestamp: Date;
  payload?: any;
  violation?: GuardrailViolation;
}

