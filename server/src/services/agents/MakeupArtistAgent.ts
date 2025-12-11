/**
 * Makeup Artist Agent
 * Generates personalized makeup routines based on skin tone analysis, occasion, and products
 * Uses computer vision to match foundation shades
 */

import { userMemory } from '../../lib/raindrop-config.js';
import { vultrValkey } from '../../lib/vultr-valkey.js';
import { ExternalServiceError } from '../../lib/errors.js';

export interface SkinToneAnalysis {
  undertone: 'warm' | 'cool' | 'neutral';
  depth: 'light' | 'medium' | 'tan' | 'deep';
  confidence: number;
  foundationShade?: string;
  recommendedColors: {
    lipstick: string[];
    eyeshadow: string[];
    blush: string[];
  };
}

export interface MakeupProduct {
  id: string;
  name: string;
  brand: string;
  category: 'foundation' | 'lipstick' | 'eyeshadow' | 'blush' | 'mascara' | 'concealer' | 'primer';
  shade?: string;
  color?: string;
  price: number;
  imageUrl?: string;
  rating?: number;
  url?: string;
}

export interface MakeupStep {
  stepNumber: number;
  product: MakeupProduct;
  application: string;
  tips?: string;
  duration?: number; // in minutes
}

export interface MakeupLook {
  id: string;
  name: string;
  occasion: string;
  steps: MakeupStep[];
  totalDuration: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  confidence: number;
  reasoning: string;
  totalPrice: number;
}

export interface MakeupRecommendationParams {
  userId: string;
  selfieUrl?: string;
  occasion: string;
  skinTone?: {
    undertone?: 'warm' | 'cool' | 'neutral';
    depth?: 'light' | 'medium' | 'tan' | 'deep';
  };
  preferences?: {
    intensity?: 'natural' | 'moderate' | 'bold';
    colors?: string[];
    brands?: string[];
  };
  budget?: number;
}

export interface MakeupRecommendationResult {
  looks: MakeupLook[];
  skinAnalysis?: SkinToneAnalysis;
  totalLooks: number;
  averageConfidence: number;
  reasoning: string;
}

export class MakeupArtistAgent {
  private readonly CACHE_TTL = 3600; // 1 hour
  private readonly DEFAULT_LOOK_COUNT = 3;

  /**
   * Generate personalized makeup look based on skin tone and occasion
   */
  async generateLook(params: MakeupRecommendationParams): Promise<MakeupRecommendationResult> {
    const cacheKey = `makeup:${params.userId}:${params.occasion}:${params.skinTone?.undertone || 'unknown'}`;
    
    try {
      const cached = await vultrValkey.get<MakeupRecommendationResult>(cacheKey);
      if (cached) {
        return cached;
      }
    } catch (error) {
      // Cache miss is fine
    }

    try {
      // Analyze skin tone if selfie provided
      let skinAnalysis: SkinToneAnalysis | undefined;
      if (params.selfieUrl) {
        skinAnalysis = await this.analyzeSkinTone(params.selfieUrl);
      } else if (params.skinTone) {
        // Use provided skin tone info
        skinAnalysis = {
          undertone: params.skinTone.undertone || 'neutral',
          depth: params.skinTone.depth || 'medium',
          confidence: 0.7,
          recommendedColors: this.getRecommendedColors(
            params.skinTone.undertone || 'neutral',
            params.skinTone.depth || 'medium'
          ),
        };
      } else {
        // Try to get from user profile
        const userProfile = await this.getUserProfile(params.userId);
        if (userProfile.skinTone) {
          skinAnalysis = {
            undertone: userProfile.skinTone.undertone || 'neutral',
            depth: userProfile.skinTone.depth || 'medium',
            confidence: 0.6,
            recommendedColors: this.getRecommendedColors(
              userProfile.skinTone.undertone || 'neutral',
              userProfile.skinTone.depth || 'medium'
            ),
          };
        }
      }

      // Fetch makeup products
      const products = await this.fetchMakeupProducts({
        skinAnalysis,
        occasion: params.occasion,
        preferences: params.preferences,
        budget: params.budget,
      });

      // Generate makeup looks
      const looks = await this.generateMakeupLooks({
        products,
        skinAnalysis,
        occasion: params.occasion,
        preferences: params.preferences,
      });

      // Rank and filter looks
      const rankedLooks = this.rankLooks(looks, params.preferences);
      const filteredLooks = rankedLooks.slice(0, this.DEFAULT_LOOK_COUNT);

      const averageConfidence = filteredLooks.length > 0
        ? filteredLooks.reduce((sum, l) => sum + l.confidence, 0) / filteredLooks.length
        : 0;

      const result: MakeupRecommendationResult = {
        looks: filteredLooks,
        skinAnalysis,
        totalLooks: filteredLooks.length,
        averageConfidence,
        reasoning: this.generateReasoning(filteredLooks, params.occasion, skinAnalysis),
      };

      // Cache result
      await vultrValkey.set(cacheKey, result, this.CACHE_TTL).catch(() => {});

      return result;
    } catch (error) {
      throw new ExternalServiceError(
        'MakeupArtistAgent',
        `Failed to generate makeup look: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : new Error(String(error)),
        { userId: params.userId }
      );
    }
  }

  /**
   * Analyze skin tone from selfie using vision model
   * In production, this would use a computer vision API
   */
  private async analyzeSkinTone(selfieUrl: string): Promise<SkinToneAnalysis> {
    // TODO: Integrate with actual vision model (e.g., OpenAI Vision, Google Vision API)
    // For now, return a mock analysis based on common patterns
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // Mock analysis - in production, this would call a vision API
    // This is a placeholder that would be replaced with actual CV model
    const mockAnalysis: SkinToneAnalysis = {
      undertone: 'neutral',
      depth: 'medium',
      confidence: 0.85,
      foundationShade: 'NC30',
      recommendedColors: {
        lipstick: ['rose', 'berry', 'nude'],
        eyeshadow: ['taupe', 'bronze', 'champagne'],
        blush: ['peach', 'coral'],
      },
    };

    return mockAnalysis;
  }

  /**
   * Get recommended colors based on skin tone
   */
  private getRecommendedColors(
    undertone: 'warm' | 'cool' | 'neutral',
    depth: 'light' | 'medium' | 'tan' | 'deep'
  ): SkinToneAnalysis['recommendedColors'] {
    const colorMap: Record<string, SkinToneAnalysis['recommendedColors']> = {
      'warm-light': {
        lipstick: ['peach', 'coral', 'warm pink'],
        eyeshadow: ['gold', 'bronze', 'warm brown'],
        blush: ['peach', 'coral'],
      },
      'warm-medium': {
        lipstick: ['terracotta', 'warm red', 'coral'],
        eyeshadow: ['copper', 'amber', 'warm brown'],
        blush: ['coral', 'warm peach'],
      },
      'warm-tan': {
        lipstick: ['brick red', 'warm berry', 'terracotta'],
        eyeshadow: ['bronze', 'copper', 'gold'],
        blush: ['coral', 'warm rose'],
      },
      'warm-deep': {
        lipstick: ['deep berry', 'warm burgundy', 'terracotta'],
        eyeshadow: ['bronze', 'copper', 'amber'],
        blush: ['deep coral', 'warm rose'],
      },
      'cool-light': {
        lipstick: ['pink', 'berry', 'cool red'],
        eyeshadow: ['silver', 'taupe', 'cool brown'],
        blush: ['pink', 'rose'],
      },
      'cool-medium': {
        lipstick: ['berry', 'cool red', 'plum'],
        eyeshadow: ['taupe', 'silver', 'cool brown'],
        blush: ['rose', 'cool pink'],
      },
      'cool-tan': {
        lipstick: ['plum', 'berry', 'cool red'],
        eyeshadow: ['taupe', 'silver', 'cool brown'],
        blush: ['rose', 'cool pink'],
      },
      'cool-deep': {
        lipstick: ['deep plum', 'berry', 'cool burgundy'],
        eyeshadow: ['taupe', 'silver', 'cool brown'],
        blush: ['deep rose', 'cool pink'],
      },
      'neutral-light': {
        lipstick: ['nude', 'rose', 'berry'],
        eyeshadow: ['taupe', 'bronze', 'champagne'],
        blush: ['peach', 'rose'],
      },
      'neutral-medium': {
        lipstick: ['rose', 'berry', 'nude'],
        eyeshadow: ['taupe', 'bronze', 'champagne'],
        blush: ['peach', 'coral'],
      },
      'neutral-tan': {
        lipstick: ['berry', 'terracotta', 'nude'],
        eyeshadow: ['bronze', 'taupe', 'champagne'],
        blush: ['coral', 'peach'],
      },
      'neutral-deep': {
        lipstick: ['deep berry', 'plum', 'terracotta'],
        eyeshadow: ['bronze', 'taupe', 'amber'],
        blush: ['coral', 'rose'],
      },
    };

    const key = `${undertone}-${depth}`;
    return colorMap[key] || colorMap['neutral-medium'];
  }

  /**
   * Fetch makeup products based on criteria
   */
  private async fetchMakeupProducts(params: {
    skinAnalysis?: SkinToneAnalysis;
    occasion: string;
    preferences?: MakeupRecommendationParams['preferences'];
    budget?: number;
  }): Promise<MakeupProduct[]> {
    // In production, this would query a makeup product database
    // For now, return mock products that match the criteria
    
    const allProducts: MakeupProduct[] = [
      // Foundations
      { id: 'foundation-1', name: 'Perfect Match Foundation', brand: 'BeautyBrand', category: 'foundation', shade: 'NC30', price: 35, rating: 4.5 },
      { id: 'foundation-2', name: 'Flawless Finish', brand: 'Glamour', category: 'foundation', shade: 'NC25', price: 42, rating: 4.7 },
      
      // Lipsticks
      { id: 'lip-1', name: 'Rose Lipstick', brand: 'BeautyBrand', category: 'lipstick', color: 'rose', price: 22, rating: 4.6 },
      { id: 'lip-2', name: 'Berry Shine', brand: 'Glamour', category: 'lipstick', color: 'berry', price: 24, rating: 4.5 },
      { id: 'lip-3', name: 'Nude Perfect', brand: 'BeautyBrand', category: 'lipstick', color: 'nude', price: 20, rating: 4.4 },
      
      // Eyeshadows
      { id: 'eye-1', name: 'Taupe Palette', brand: 'Glamour', category: 'eyeshadow', color: 'taupe', price: 28, rating: 4.7 },
      { id: 'eye-2', name: 'Bronze Glow', brand: 'BeautyBrand', category: 'eyeshadow', color: 'bronze', price: 30, rating: 4.6 },
      
      // Blush
      { id: 'blush-1', name: 'Peach Blush', brand: 'BeautyBrand', category: 'blush', color: 'peach', price: 18, rating: 4.5 },
      { id: 'blush-2', name: 'Coral Glow', brand: 'Glamour', category: 'blush', color: 'coral', price: 20, rating: 4.6 },
      
      // Mascara
      { id: 'mascara-1', name: 'Volume Mascara', brand: 'BeautyBrand', category: 'mascara', price: 16, rating: 4.8 },
      
      // Concealer
      { id: 'concealer-1', name: 'Perfect Cover', brand: 'Glamour', category: 'concealer', shade: 'NC30', price: 19, rating: 4.6 },
      
      // Primer
      { id: 'primer-1', name: 'Smooth Base', brand: 'BeautyBrand', category: 'primer', price: 25, rating: 4.7 },
    ];

    // Filter by preferences
    let filtered = allProducts;

    if (params.skinAnalysis?.recommendedColors) {
      const recommended = params.skinAnalysis.recommendedColors;
      filtered = filtered.filter((p) => {
        if (p.category === 'lipstick' && p.color) {
          return recommended.lipstick.some((c) => p.color?.toLowerCase().includes(c));
        }
        if (p.category === 'eyeshadow' && p.color) {
          return recommended.eyeshadow.some((c) => p.color?.toLowerCase().includes(c));
        }
        if (p.category === 'blush' && p.color) {
          return recommended.blush.some((c) => p.color?.toLowerCase().includes(c));
        }
        if (p.category === 'foundation' && params.skinAnalysis?.foundationShade) {
          return p.shade === params.skinAnalysis.foundationShade;
        }
        return true; // Include other categories
      });
    }

    if (params.preferences?.brands) {
      filtered = filtered.filter((p) =>
        params.preferences!.brands!.some((b) =>
          p.brand.toLowerCase().includes(b.toLowerCase())
        )
      );
    }

    if (params.budget) {
      filtered = filtered.filter((p) => p.price <= params.budget * 0.4); // Individual items shouldn't exceed 40% of budget
    }

    return filtered;
  }

  /**
   * Generate makeup looks from products
   */
  private async generateMakeupLooks(params: {
    products: MakeupProduct[];
    skinAnalysis?: SkinToneAnalysis;
    occasion: string;
    preferences?: MakeupRecommendationParams['preferences'];
  }): Promise<MakeupLook[]> {
    const looks: MakeupLook[] = [];

    // Group products by category
    const productsByCategory = this.groupProductsByCategory(params.products);

    // Generate looks based on occasion
    const lookTemplates = this.getLookTemplatesForOccasion(params.occasion);

    for (const template of lookTemplates) {
      const look = await this.createMakeupLook({
        template,
        productsByCategory,
        skinAnalysis: params.skinAnalysis,
        preferences: params.preferences,
        occasion: params.occasion,
      });

      if (look) {
        looks.push(look);
      }
    }

    return looks;
  }

  /**
   * Group products by category
   */
  private groupProductsByCategory(products: MakeupProduct[]): Record<string, MakeupProduct[]> {
    const grouped: Record<string, MakeupProduct[]> = {
      foundation: [],
      lipstick: [],
      eyeshadow: [],
      blush: [],
      mascara: [],
      concealer: [],
      primer: [],
    };

    for (const product of products) {
      if (grouped[product.category]) {
        grouped[product.category].push(product);
      }
    }

    return grouped;
  }

  /**
   * Get look templates for occasion
   */
  private getLookTemplatesForOccasion(occasion: string): Array<{
    name: string;
    steps: Array<{ category: string; required: boolean }>;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
  }> {
    const templates: Record<string, Array<{
      name: string;
      steps: Array<{ category: string; required: boolean }>;
      difficulty: 'beginner' | 'intermediate' | 'advanced';
    }>> = {
      wedding: [
        {
          name: 'Classic Bridal',
          steps: [
            { category: 'primer', required: true },
            { category: 'foundation', required: true },
            { category: 'concealer', required: true },
            { category: 'eyeshadow', required: true },
            { category: 'mascara', required: true },
            { category: 'blush', required: true },
            { category: 'lipstick', required: true },
          ],
          difficulty: 'intermediate',
        },
      ],
      party: [
        {
          name: 'Bold Party Look',
          steps: [
            { category: 'primer', required: true },
            { category: 'foundation', required: true },
            { category: 'eyeshadow', required: true },
            { category: 'mascara', required: true },
            { category: 'blush', required: true },
            { category: 'lipstick', required: true },
          ],
          difficulty: 'advanced',
        },
      ],
      casual: [
        {
          name: 'Natural Day Look',
          steps: [
            { category: 'foundation', required: false },
            { category: 'concealer', required: true },
            { category: 'mascara', required: true },
            { category: 'blush', required: false },
            { category: 'lipstick', required: true },
          ],
          difficulty: 'beginner',
        },
      ],
      business: [
        {
          name: 'Professional Look',
          steps: [
            { category: 'primer', required: false },
            { category: 'foundation', required: true },
            { category: 'concealer', required: true },
            { category: 'eyeshadow', required: true },
            { category: 'mascara', required: true },
            { category: 'blush', required: true },
            { category: 'lipstick', required: true },
          ],
          difficulty: 'intermediate',
        },
      ],
    };

    return templates[occasion.toLowerCase()] || templates.casual;
  }

  /**
   * Create a makeup look from template
   */
  private async createMakeupLook(params: {
    template: { name: string; steps: Array<{ category: string; required: boolean }>; difficulty: 'beginner' | 'intermediate' | 'advanced' };
    productsByCategory: Record<string, MakeupProduct[]>;
    skinAnalysis?: SkinToneAnalysis;
    preferences?: MakeupRecommendationParams['preferences'];
    occasion: string;
  }): Promise<MakeupLook | null> {
    const steps: MakeupStep[] = [];
    let stepNumber = 1;

    for (const stepTemplate of params.template.steps) {
      const availableProducts = params.productsByCategory[stepTemplate.category] || [];
      
      if (stepTemplate.required && availableProducts.length === 0) {
        return null; // Can't create look without required products
      }

      if (availableProducts.length > 0) {
        // Select best product (highest rating)
        const product = availableProducts.sort((a, b) => (b.rating || 0) - (a.rating || 0))[0];

        steps.push({
          stepNumber: stepNumber++,
          product,
          application: this.getApplicationInstructions(stepTemplate.category, params.occasion),
          tips: this.getTipsForStep(stepTemplate.category),
          duration: this.getDurationForStep(stepTemplate.category),
        });
      }
    }

    if (steps.length === 0) {
      return null;
    }

    const totalPrice = steps.reduce((sum, s) => sum + s.product.price, 0);
    const totalDuration = steps.reduce((sum, s) => sum + (s.duration || 0), 0);
    const confidence = this.calculateLookConfidence(steps, params.skinAnalysis, params.preferences);

    return {
      id: `look-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: params.template.name,
      occasion: params.occasion,
      steps,
      totalDuration,
      difficulty: params.template.difficulty,
      confidence,
      reasoning: this.generateLookReasoning(steps, params.skinAnalysis, params.occasion),
      totalPrice,
    };
  }

  /**
   * Get application instructions for a step
   */
  private getApplicationInstructions(category: string, occasion: string): string {
    const instructions: Record<string, string> = {
      primer: 'Apply a thin layer all over face, focusing on T-zone',
      foundation: 'Blend evenly using a brush or sponge, starting from center of face',
      concealer: 'Apply under eyes and on any blemishes, blend gently',
      eyeshadow: occasion === 'party' ? 'Apply bold colors, blend well' : 'Apply neutral shades, blend for soft look',
      mascara: 'Apply 2-3 coats, wiggling wand from roots to tips',
      blush: 'Apply to apples of cheeks, blend upward toward temples',
      lipstick: 'Apply directly or use a brush for precision',
    };

    return instructions[category] || 'Apply as directed';
  }

  /**
   * Get tips for a step
   */
  private getTipsForStep(category: string): string | undefined {
    const tips: Record<string, string> = {
      foundation: 'Match to your neck for seamless blend',
      concealer: 'Set with powder to prevent creasing',
      eyeshadow: 'Use primer for longer wear',
      lipstick: 'Line lips first for definition',
    };

    return tips[category];
  }

  /**
   * Get duration for a step (in minutes)
   */
  private getDurationForStep(category: string): number {
    const durations: Record<string, number> = {
      primer: 1,
      foundation: 3,
      concealer: 2,
      eyeshadow: 5,
      mascara: 2,
      blush: 1,
      lipstick: 2,
    };

    return durations[category] || 2;
  }

  /**
   * Calculate look confidence
   */
  private calculateLookConfidence(
    steps: MakeupStep[],
    skinAnalysis?: SkinToneAnalysis,
    preferences?: MakeupRecommendationParams['preferences']
  ): number {
    let confidence = 0.5;

    // Completeness (has essential steps)
    const hasFoundation = steps.some((s) => s.product.category === 'foundation');
    const hasLipstick = steps.some((s) => s.product.category === 'lipstick');
    const hasMascara = steps.some((s) => s.product.category === 'mascara');
    
    const completeness = (hasFoundation ? 0.33 : 0) + (hasLipstick ? 0.33 : 0) + (hasMascara ? 0.34 : 0);
    confidence += completeness * 0.3;

    // Product ratings
    const avgRating = steps.reduce((sum, s) => sum + (s.product.rating || 3.5), 0) / steps.length;
    confidence += (avgRating / 5) * 0.3;

    // Skin tone match (if analysis available)
    if (skinAnalysis) {
      confidence += 0.2;
    }

    // Preference match
    if (preferences) {
      confidence += 0.2;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Rank looks by confidence
   */
  private rankLooks(looks: MakeupLook[], preferences?: MakeupRecommendationParams['preferences']): MakeupLook[] {
    return looks.sort((a, b) => {
      // Primary: confidence
      if (Math.abs(a.confidence - b.confidence) > 0.05) {
        return b.confidence - a.confidence;
      }
      // Secondary: difficulty (prefer easier for beginners)
      if (preferences?.intensity === 'natural') {
        const difficultyOrder = { beginner: 3, intermediate: 2, advanced: 1 };
        return difficultyOrder[b.difficulty] - difficultyOrder[a.difficulty];
      }
      return 0;
    });
  }

  /**
   * Generate reasoning for look
   */
  private generateLookReasoning(
    steps: MakeupStep[],
    skinAnalysis?: SkinToneAnalysis,
    occasion?: string
  ): string {
    const reasons: string[] = [];

    if (skinAnalysis) {
      reasons.push(`Matched to your ${skinAnalysis.undertone} undertone and ${skinAnalysis.depth} skin tone`);
    }

    if (occasion) {
      reasons.push(`Perfect for ${occasion} events`);
    }

    const colors = steps
      .map((s) => s.product.color)
      .filter((c): c is string => !!c)
      .filter((c, i, arr) => arr.indexOf(c) === i);

    if (colors.length > 0) {
      reasons.push(`Features ${colors.join(', ')} tones`);
    }

    return reasons.length > 0
      ? reasons.join('. ') + '.'
      : 'Curated based on your preferences.';
  }

  /**
   * Generate overall reasoning
   */
  private generateReasoning(
    looks: MakeupLook[],
    occasion: string,
    skinAnalysis?: SkinToneAnalysis
  ): string {
    if (looks.length === 0) {
      return 'Unable to generate makeup looks with the current constraints.';
    }

    const skinInfo = skinAnalysis
      ? ` for your ${skinAnalysis.undertone} undertone and ${skinAnalysis.depth} skin tone`
      : '';

    return `Created ${looks.length} complete makeup look${looks.length > 1 ? 's' : ''}${skinInfo}, perfect for ${occasion} events.`;
  }

  /**
   * Get user profile
   */
  private async getUserProfile(userId: string): Promise<{ skinTone?: { undertone?: string; depth?: string } }> {
    try {
      const profile = await userMemory.get(userId);
      return {
        skinTone: profile?.skinTone,
      };
    } catch (error) {
      return {};
    }
  }
}

// Singleton instance
export const makeupArtistAgent = new MakeupArtistAgent();
