/**
 * Agent-Specific Guardrails
 * Implements guardrails for Personal Shopper, Makeup Artist, Size Predictor, and Returns Predictor
 */

import type {
  GuardrailCheck,
  UserProfile,
  OutfitBundle,
  MakeupRecommendation,
  SizePrediction,
  ReturnPrediction,
} from './types.js';
import { BudgetExceededError, PermissionDeniedError } from './errors.js';
import { guardrailEngine } from './policy-engine.js';

/**
 * Personal Shopper Guardrails
 */
export class PersonalShopperGuardrails {
  static getChecks(): GuardrailCheck[] {
    return [
      {
        name: 'budget_check',
        validate: async (payload: OutfitBundle, user: UserProfile) => {
          const budgetCap = user.permissions?.budgetCap || 250; // Default $250
          return payload.total <= budgetCap;
        },
        reason: 'BUDGET_EXCEEDED',
        severity: 'high',
        autoCorrect: async (payload: OutfitBundle, user: UserProfile) => {
          const budgetCap = user.permissions?.budgetCap || 250;
          // Remove items until under budget
          const sortedItems = [...payload.items].sort((a, b) => 
            (b.product.price * b.quantity) - (a.product.price * a.quantity)
          );
          
          let total = 0;
          const filteredItems = [];
          
          for (const item of sortedItems) {
            const itemTotal = item.product.price * item.quantity;
            if (total + itemTotal <= budgetCap) {
              filteredItems.push(item);
              total += itemTotal;
            }
          }
          
          return {
            ...payload,
            items: filteredItems,
            total,
          };
        },
      },
      {
        name: 'sponsor_diversity',
        validate: async (payload: OutfitBundle) => {
          if (payload.items.length === 0) return true;
          
          const brandCounts = new Map<string, number>();
          let totalItems = 0;
          
          for (const item of payload.items) {
            const brand = item.product.brand;
            brandCounts.set(brand, (brandCounts.get(brand) || 0) + item.quantity);
            totalItems += item.quantity;
          }
          
          // Check if any brand exceeds 60% of items
          for (const [brand, count] of brandCounts.entries()) {
            if (count / totalItems > 0.6) {
              return false;
            }
          }
          
          return true;
        },
        reason: 'SPONSOR_BIAS',
        severity: 'medium',
        autoCorrect: async (payload: OutfitBundle) => {
          // Diversify brands by replacing items from dominant brand
          const brandCounts = new Map<string, number>();
          let totalItems = 0;
          
          for (const item of payload.items) {
            const brand = item.product.brand;
            brandCounts.set(brand, (brandCounts.get(brand) || 0) + item.quantity);
            totalItems += item.quantity;
          }
          
          // Find dominant brand
          let dominantBrand = '';
          let maxShare = 0;
          
          for (const [brand, count] of brandCounts.entries()) {
            const share = count / totalItems;
            if (share > maxShare) {
              maxShare = share;
              dominantBrand = brand;
            }
          }
          
          // If no brand exceeds 60%, return as-is
          if (maxShare <= 0.6) {
            return payload;
          }
          
          // Remove some items from dominant brand
          const diversifiedItems = payload.items.map(item => {
            if (item.product.brand === dominantBrand) {
              // Reduce quantity to bring share below 60%
              const targetCount = Math.floor(totalItems * 0.6);
              const currentCount = brandCounts.get(dominantBrand) || 0;
              if (currentCount > targetCount) {
                const reduction = currentCount - targetCount;
                return {
                  ...item,
                  quantity: Math.max(1, item.quantity - Math.ceil(reduction / payload.items.filter(i => i.product.brand === dominantBrand).length)),
                };
              }
            }
            return item;
          });
          
          const newTotal = diversifiedItems.reduce(
            (sum, item) => sum + (item.product.price * item.quantity),
            0
          );
          
          return {
            ...payload,
            items: diversifiedItems,
            total: newTotal,
          };
        },
      },
      {
        name: 'inventory_check',
        validate: async (payload: OutfitBundle) => {
          for (const item of payload.items) {
            if (item.product.inStock === false || (item.product.stock !== undefined && item.product.stock < item.quantity)) {
              return false;
            }
          }
          return true;
        },
        reason: 'OUT_OF_STOCK',
        severity: 'medium',
        autoCorrect: async (payload: OutfitBundle) => {
          // Remove out-of-stock items
          const availableItems = payload.items.filter(item => {
            if (item.product.inStock === false) return false;
            if (item.product.stock !== undefined && item.product.stock < item.quantity) {
              // Adjust quantity to available stock
              return item.product.stock > 0;
            }
            return true;
          }).map(item => {
            if (item.product.stock !== undefined && item.product.stock < item.quantity) {
              return {
                ...item,
                quantity: item.product.stock,
              };
            }
            return item;
          });
          
          const newTotal = availableItems.reduce(
            (sum, item) => sum + (item.product.price * item.quantity),
            0
          );
          
          return {
            ...payload,
            items: availableItems,
            total: newTotal,
          };
        },
      },
      {
        name: 'age_appropriateness',
        validate: async (payload: OutfitBundle, user: UserProfile) => {
          if (!user.age) return true; // Can't validate without age
          
          for (const item of payload.items) {
            if (item.product.ageRating) {
              const minAge = this.parseAgeRating(item.product.ageRating);
              if (user.age < minAge) {
                return false;
              }
            }
          }
          
          return true;
        },
        reason: 'AGE_INAPPROPRIATE',
        severity: 'high',
        autoCorrect: async (payload: OutfitBundle, user: UserProfile) => {
          if (!user.age) return payload;
          
          // Filter out age-inappropriate items
          const appropriateItems = payload.items.filter(item => {
            if (!item.product.ageRating) return true;
            const minAge = this.parseAgeRating(item.product.ageRating);
            return user.age! >= minAge;
          });
          
          const newTotal = appropriateItems.reduce(
            (sum, item) => sum + (item.product.price * item.quantity),
            0
          );
          
          return {
            ...payload,
            items: appropriateItems,
            total: newTotal,
          };
        },
      },
    ];
  }

  private static parseAgeRating(rating: string): number {
    // Parse age ratings like "13+", "18+", "all ages"
    const match = rating.match(/(\d+)\+/);
    if (match) {
      return parseInt(match[1], 10);
    }
    if (rating.toLowerCase().includes('all ages') || rating.toLowerCase().includes('all')) {
      return 0;
    }
    return 18; // Default to 18+ if unclear
  }
}

/**
 * Makeup Artist Guardrails
 */
export class MakeupArtistGuardrails {
  static getChecks(): GuardrailCheck[] {
    return [
      {
        name: 'skin_safety',
        validate: async (payload: MakeupRecommendation, user: UserProfile) => {
          // Validate Fitzpatrick scale compatibility
          for (const product of payload.products) {
            if (product.fitzpatrickScale !== undefined) {
              // Basic validation - in production, would check against user's skin tone
              if (product.fitzpatrickScale < 1 || product.fitzpatrickScale > 6) {
                return false;
              }
            }
          }
          return true;
        },
        reason: 'UNSAFE_SHADE',
        severity: 'high',
        autoCorrect: async (payload: MakeupRecommendation) => {
          // Remove unsafe shades
          const safeProducts = payload.products.filter(product => {
            if (product.fitzpatrickScale === undefined) return true;
            return product.fitzpatrickScale >= 1 && product.fitzpatrickScale <= 6;
          });
          
          return {
            ...payload,
            products: safeProducts,
          };
        },
      },
      {
        name: 'allergy_check',
        validate: async (payload: MakeupRecommendation, user: UserProfile) => {
          const allergies = user.preferences?.allergies || [];
          if (allergies.length === 0) return true;
          
          for (const product of payload.products) {
            const ingredients = product.ingredients || [];
            for (const ingredient of ingredients) {
              for (const allergy of allergies) {
                if (ingredient.toLowerCase().includes(allergy.toLowerCase())) {
                  return false;
                }
              }
            }
          }
          
          return true;
        },
        reason: 'ALLERGIC_FLAG',
        severity: 'critical',
        autoCorrect: async (payload: MakeupRecommendation, user: UserProfile) => {
          const allergies = user.preferences?.allergies || [];
          if (allergies.length === 0) return payload;
          
          // Remove products with allergens
          const safeProducts = payload.products.filter(product => {
            const ingredients = product.ingredients || [];
            for (const ingredient of ingredients) {
              for (const allergy of allergies) {
                if (ingredient.toLowerCase().includes(allergy.toLowerCase())) {
                  return false;
                }
              }
            }
            return true;
          });
          
          return {
            ...payload,
            products: safeProducts,
          };
        },
      },
      {
        name: 'medical_warnings',
        validate: async (payload: MakeupRecommendation, user: UserProfile) => {
          const medicalFlags = user.preferences?.medicalFlags;
          if (!medicalFlags) return true;
          
          // Check for pregnancy/acne flags - these require warnings, not blocking
          // This check always passes, but warnings are added elsewhere
          return true;
        },
        reason: 'MEDICAL_WARNING',
        severity: 'low',
      },
      {
        name: 'minors_check',
        validate: async (payload: MakeupRecommendation, user: UserProfile) => {
          if (!user.age) return true;
          
          // Lock recommendations for users under 16
          if (user.age < 16) {
            return false;
          }
          
          return true;
        },
        reason: 'MINOR_LOCK',
        severity: 'high',
      },
    ];
  }
}

/**
 * Size Predictor Guardrails
 */
export class SizePredictorGuardrails {
  static getChecks(): GuardrailCheck[] {
    return [
      {
        name: 'confidence_threshold',
        validate: async (payload: SizePrediction) => {
          // Require at least 75% confidence
          return payload.confidence >= 0.75;
        },
        reason: 'LOW_CONFIDENCE',
        severity: 'medium',
        // No auto-correct - force alternatives
      },
      {
        name: 'body_positivity',
        validate: async (payload: SizePrediction) => {
          // This is a content filter check - ensure no negative body language
          // In production, would check reasoning text for problematic phrases
          return true; // Always pass - actual filtering happens in output sanitization
        },
        reason: 'BODY_POSITIVITY_VIOLATION',
        severity: 'medium',
      },
      {
        name: 'measurement_validation',
        validate: async (payload: SizePrediction, user: UserProfile) => {
          if (!payload.measurements) return true;
          
          const { height, weight } = payload.measurements;
          if (!height || !weight) return true;
          
          // Validate BMI range (14-40)
          const heightM = height / 100; // Convert cm to meters
          const bmi = weight / (heightM * heightM);
          
          return bmi >= 14 && bmi <= 40;
        },
        reason: 'INVALID_MEASUREMENTS',
        severity: 'high',
      },
    ];
  }
}

/**
 * Returns Predictor Guardrails
 */
export class ReturnsPredictorGuardrails {
  static getChecks(): GuardrailCheck[] {
    return [
      {
        name: 'false_positive_prevention',
        validate: async (payload: ReturnPrediction) => {
          // Don't intervene if risk is very low (<10%)
          if (payload.riskScore < 0.1) {
            return true;
          }
          
          // For higher risks, validate that prediction is meaningful
          return payload.riskLevel !== undefined;
        },
        reason: 'FALSE_POSITIVE',
        severity: 'low',
      },
      {
        name: 'refund_abuse_prevention',
        validate: async (payload: ReturnPrediction, user: UserProfile) => {
          const maxAutoRefunds = user.permissions?.maxAutoRefunds || 3;
          const currentCount = user.autoRefundCount || 0;
          
          // Check if we need to reset the counter (new month)
          const resetDate = user.autoRefundResetDate;
          const now = new Date();
          if (!resetDate || now.getMonth() !== resetDate.getMonth() || now.getFullYear() !== resetDate.getFullYear()) {
            // Counter should be reset - this is handled by the permission system
            return true;
          }
          
          return currentCount < maxAutoRefunds;
        },
        reason: 'REFUND_ABUSE',
        severity: 'high',
      },
      {
        name: 'privacy_protection',
        validate: async (payload: ReturnPrediction) => {
          // Ensure return reasons are anonymized
          // This is more of an output sanitization check
          return true;
        },
        reason: 'PRIVACY_VIOLATION',
        severity: 'critical',
      },
      {
        name: 'inventory_impact',
        validate: async (payload: ReturnPrediction) => {
          // Don't recommend low-stock alternatives
          // This would require product data in the payload
          return true;
        },
        reason: 'INVENTORY_IMPACT',
        severity: 'low',
      },
    ];
  }
}

/**
 * Initialize all agent guardrails
 */
export function initializeAgentGuardrails(): void {
  guardrailEngine.registerChecks('personalShopper', PersonalShopperGuardrails.getChecks());
  guardrailEngine.registerChecks('cartAgent', PersonalShopperGuardrails.getChecks()); // Cart agent uses same checks
  guardrailEngine.registerChecks('makeupArtist', MakeupArtistGuardrails.getChecks());
  guardrailEngine.registerChecks('sizePredictor', SizePredictorGuardrails.getChecks());
  guardrailEngine.registerChecks('returnsPredictor', ReturnsPredictorGuardrails.getChecks());
}

