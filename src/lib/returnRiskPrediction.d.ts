/**
 * Return Risk Prediction Service
 * Comprehensive ML-based return risk prediction with 55+ features
 * Production-ready implementation with fairness and bias mitigation
 */
export interface UserProfile {
    userId: string;
    totalPurchases: number;
    totalReturns: number;
    returnRate: number;
    avgOrderValue: number;
    avgReturnValue: number;
    accountAgeInDays: number;
    preferredSize?: string;
    sizeAccuracy?: number;
    reviewScore?: number;
    loyaltyTier?: 'bronze' | 'silver' | 'gold' | 'platinum';
    preferredBrands?: string[];
    preferredCategories?: string[];
    deviceConsistency?: number;
    paymentMethodHistory?: string[];
}
export interface ProductInfo {
    productId: string;
    category: string;
    brand: string;
    price: number;
    fit?: 'tight' | 'normal' | 'loose' | 'oversized';
    ratingAverage?: number;
    ratingCount?: number;
    returnCount?: number;
    totalSold?: number;
    inStock?: boolean;
    size?: string;
    fabric?: string;
    seasonal?: boolean;
    onClearance?: boolean;
}
export interface TransactionContext {
    deviceType: 'desktop' | 'mobile' | 'tablet';
    isNewCustomer: boolean;
    isGiftPurchase?: boolean;
    shippingSpeed?: 'standard' | 'express' | 'overnight';
    paymentMethod: 'credit_card' | 'debit_card' | 'paypal' | 'apple_pay' | 'other';
    promoApplied?: boolean;
    promoDiscount?: number;
    returnsWindow?: number;
    isInternational?: boolean;
    previouslyReturnedBrand?: boolean;
    daysSincePurchase?: number;
}
export interface RiskFactor {
    name: string;
    impact: number;
    value: string;
    contribution: number;
}
export interface RiskPrediction {
    riskScore: number;
    riskLevel: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
    confidence: number;
    factors: RiskFactor[];
    recommendations: string[];
    modelVersion: string;
    baselineRisk?: number;
}
export declare class ReturnRiskPredictionService {
    private featureEngineer;
    private model;
    private cache;
    private readonly CACHE_TTL;
    constructor();
    /**
     * Predict return risk for a single transaction
     */
    predict(user: UserProfile, product: ProductInfo, context: TransactionContext): Promise<RiskPrediction>;
    /**
     * Predict return risk for multiple transactions (batch)
     */
    predictBatch(inputs: Array<{
        user: UserProfile;
        product: ProductInfo;
        context: TransactionContext;
    }>): Promise<RiskPrediction[]>;
    private getCacheKey;
}
//# sourceMappingURL=returnRiskPrediction.d.ts.map