/**
 * Makeup Artist AI Agent
 * Main entrypoint for makeup artistry recommendations
 * Integrates computer vision, style analysis, and product matching
 */

import { SkinAnalyzer, type SkinAnalysis } from './skin-analyzer.js';
import { RoutineBuilder, type MakeupRoutine } from './routine-builder.js';
import { ProductRecommender, type ProductRecommendations } from './product-recommender.js';
import { ExternalServiceError } from '../../../lib/errors.js';
import { withGuardrails, validateInput, sanitizeOutput } from '../../../lib/guardrails/integration.js';
import { permissionManager } from '../../../lib/guardrails/permissions.js';

export interface MakeupLook {
  lookId: string;
  occasion: string;
  routine: MakeupRoutine;
  analysis: SkinAnalysis;
  products: ProductRecommendations;
  createdAt: Date;
  userId?: string;
}

export interface CreateLookParams {
  selfieUrl: string;
  occasion: string;
  preferences?: string[];
  userId?: string;
}

export class MakeupArtistAgent {
  private skinAnalyzer: SkinAnalyzer;
  private routineBuilder: RoutineBuilder;
  private productRecommender: ProductRecommender;

  constructor() {
    this.skinAnalyzer = new SkinAnalyzer();
    this.routineBuilder = new RoutineBuilder();
    this.productRecommender = new ProductRecommender();
  }

  /**
   * Create a complete makeup look from selfie and occasion
   */
  async createLook(params: CreateLookParams): Promise<MakeupLook> {
    const { selfieUrl, occasion, preferences, userId } = params;

    try {
      // Validate selfie input
      const selfieValidation = validateInput('selfie', selfieUrl);
      if (!selfieValidation.valid) {
        throw new ExternalServiceError(
          'MakeupArtistAgent',
          selfieValidation.reason || 'Invalid selfie input',
          new Error(selfieValidation.reason),
          { selfieUrl }
        );
      }

      // Get user profile for guardrails
      let userProfile;
      if (userId) {
        userProfile = await permissionManager.getUserProfileWithPermissions(userId);
        
        // Check age restriction
        if (userProfile.age !== undefined && userProfile.age < 16) {
          throw new ExternalServiceError(
            'MakeupArtistAgent',
            'Makeup recommendations require parental consent for users under 16',
            new Error('MINOR_LOCK'),
            { userId, age: userProfile.age }
          );
        }
      }

      // Step 1: Analyze selfie for skin tone, undertone, face shape, features
      const analysis = await this.skinAnalyzer.analyzeSelfie(selfieUrl);

      // Step 2: Build personalized routine based on analysis and occasion
      const routine = this.routineBuilder.buildRoutine(
        analysis,
        occasion,
        preferences
      );

      // Step 3: Match sponsor products to routine steps
      const products = await this.productRecommender.getRecommendations(
        routine,
        analysis
      );

      // Step 4: Validate through guardrails
      const makeupRecommendation = {
        products: products.products?.map((p: any) => ({
          productId: p.id || p.productId,
          name: p.name,
          ingredients: p.ingredients,
          shade: p.shade,
          fitzpatrickScale: analysis.fitzpatrickScale,
          ageRating: p.ageRating,
        })) || [],
        routine,
      };

      const validated = await withGuardrails(
        'makeupArtist',
        'create_look',
        makeupRecommendation,
        userId
      );

      // Step 5: Generate tutorial steps with product integration
      const look: MakeupLook = {
        lookId: this.generateLookId(),
        occasion,
        routine,
        analysis,
        products: {
          ...products,
          products: validated.products || products.products,
        },
        createdAt: new Date(),
        userId,
      };

      return look;
    } catch (error) {
      throw new ExternalServiceError(
        'MakeupArtistAgent',
        `Failed to create makeup look: ${error instanceof Error ? error.message : String(error)}`,
        error as Error,
        { selfieUrl, occasion, userId }
      );
    }
  }

  /**
   * Analyze selfie only (for preview/quick analysis)
   */
  async analyzeSelfie(selfieUrl: string): Promise<SkinAnalysis> {
    return this.skinAnalyzer.analyzeSelfie(selfieUrl);
  }

  /**
   * Get product recommendations for existing routine
   */
  async getProductRecommendations(
    routine: MakeupRoutine,
    analysis: SkinAnalysis
  ): Promise<ProductRecommendations> {
    return this.productRecommender.getRecommendations(routine, analysis);
  }

  /**
   * Generate unique look ID
   */
  private generateLookId(): string {
    return `look_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const makeupArtistAgent = new MakeupArtistAgent();
