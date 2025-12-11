/**
 * Makeup Artist AI Agent
 * Main entrypoint for makeup artistry recommendations
 * Integrates computer vision, style analysis, and product matching
 */

import { SkinAnalyzer, type SkinAnalysis } from './skin-analyzer.js';
import { RoutineBuilder, type MakeupRoutine } from './routine-builder.js';
import { ProductRecommender, type ProductRecommendations } from './product-recommender.js';
import { ExternalServiceError } from '../../../lib/errors.js';

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

      // Step 4: Generate tutorial steps with product integration
      const look: MakeupLook = {
        lookId: this.generateLookId(),
        occasion,
        routine,
        analysis,
        products,
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
