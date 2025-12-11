/**
 * Input/Output Validation and Sanitization
 * Validates and sanitizes inputs/outputs for all agents
 */

import type { UserProfile } from './types.js';
import { GuardrailError } from './errors.js';

export class InputValidator {
  /**
   * Validate selfie input (face detection required)
   */
  static validateSelfie(selfieUrl: string): { valid: boolean; reason?: string } {
    if (!selfieUrl || typeof selfieUrl !== 'string') {
      return { valid: false, reason: 'Selfie URL is required' };
    }

    // Basic URL validation
    try {
      new URL(selfieUrl);
    } catch {
      return { valid: false, reason: 'Invalid selfie URL format' };
    }

    // In production, would use computer vision to detect face
    // For now, just validate URL format
    return { valid: true };
  }

  /**
   * Validate budget input
   */
  static validateBudget(budget: number): { valid: boolean; reason?: string } {
    if (typeof budget !== 'number' || isNaN(budget)) {
      return { valid: false, reason: 'Budget must be a number' };
    }

    if (budget < 10) {
      return { valid: false, reason: 'Budget must be at least $10' };
    }

    if (budget > 2000) {
      return { valid: false, reason: 'Budget must not exceed $2000' };
    }

    return { valid: true };
  }

  /**
   * Validate body measurements
   */
  static validateMeasurements(measurements: {
    height?: number;
    weight?: number;
    chest?: number;
    waist?: number;
    hips?: number;
  }): { valid: boolean; reason?: string; bmi?: number } {
    const { height, weight } = measurements;

    if (height !== undefined) {
      if (typeof height !== 'number' || height < 100 || height > 250) {
        return { valid: false, reason: 'Height must be between 100-250 cm' };
      }
    }

    if (weight !== undefined) {
      if (typeof weight !== 'number' || weight < 30 || weight > 300) {
        return { valid: false, reason: 'Weight must be between 30-300 kg' };
      }
    }

    // Validate BMI range (14-40)
    if (height && weight) {
      const heightM = height / 100;
      const bmi = weight / (heightM * heightM);
      
      if (bmi < 14 || bmi > 40) {
        return {
          valid: false,
          reason: 'BMI out of valid range (14-40). Please verify measurements.',
          bmi,
        };
      }

      return { valid: true, bmi };
    }

    return { valid: true };
  }

  /**
   * Validate and sanitize user query
   */
  static validateQuery(query: string): { valid: boolean; reason?: string; sanitized?: string } {
    if (!query || typeof query !== 'string') {
      return { valid: false, reason: 'Query is required' };
    }

    // Block hate speech and illegal requests (basic check)
    const blockedPatterns = [
      /hate|discrimination|illegal|drugs|weapons/i,
      // Add more patterns as needed
    ];

    for (const pattern of blockedPatterns) {
      if (pattern.test(query)) {
        return { valid: false, reason: 'Query contains prohibited content' };
      }
    }

    // Sanitize: trim and limit length
    const sanitized = query.trim().substring(0, 500);

    return { valid: true, sanitized };
  }

  /**
   * Validate age
   */
  static validateAge(age: number | undefined): { valid: boolean; reason?: string } {
    if (age === undefined) {
      return { valid: true }; // Age is optional
    }

    if (typeof age !== 'number' || isNaN(age)) {
      return { valid: false, reason: 'Age must be a number' };
    }

    if (age < 0 || age > 120) {
      return { valid: false, reason: 'Age must be between 0-120' };
    }

    return { valid: true };
  }
}

export class OutputSanitizer {
  /**
   * Sanitize recommendations to ensure no medical advice
   */
  static sanitizeRecommendations(recommendations: string[]): string[] {
    const medicalAdvicePatterns = [
      /treat|cure|diagnose|prescription|medication|doctor|physician/i,
    ];

    return recommendations.map(rec => {
      for (const pattern of medicalAdvicePatterns) {
        if (pattern.test(rec)) {
          // Replace with generic advice
          return 'For specific health concerns, please consult a healthcare professional.';
        }
      }
      return rec;
    });
  }

  /**
   * Ensure price transparency (no hidden fees)
   */
  static ensurePriceTransparency(price: number, fees?: { shipping?: number; tax?: number }): {
    basePrice: number;
    total: number;
    breakdown: string[];
  } {
    const breakdown: string[] = [];
    let total = price;

    breakdown.push(`Base price: $${price.toFixed(2)}`);

    if (fees?.shipping) {
      total += fees.shipping;
      breakdown.push(`Shipping: $${fees.shipping.toFixed(2)}`);
    }

    if (fees?.tax) {
      total += fees.tax;
      breakdown.push(`Tax: $${fees.tax.toFixed(2)}`);
    }

    breakdown.push(`Total: $${total.toFixed(2)}`);

    return {
      basePrice: price,
      total,
      breakdown,
    };
  }

  /**
   * Add source attribution to recommendations
   */
  static addSourceAttribution(
    recommendations: string[],
    sources: Array<{ type: string; name: string }>
  ): string[] {
    const attribution = sources.map(s => `${s.type}: ${s.name}`).join(', ');
    return recommendations.map(rec => `${rec} (Sources: ${attribution})`);
  }

  /**
   * Ensure colorblind-friendly palettes
   */
  static ensureColorblindAccessibility(colors: string[]): {
    colors: string[];
    warnings?: string[];
  } {
    // In production, would use colorblind simulation
    // For now, just return colors with a note
    const warnings: string[] = [];
    
    // Check for problematic color combinations
    const problematicPairs = [
      ['red', 'green'],
      ['blue', 'purple'],
    ];

    for (const [color1, color2] of problematicPairs) {
      if (colors.includes(color1) && colors.includes(color2)) {
        warnings.push(`Color combination ${color1}/${color2} may be difficult to distinguish for colorblind users`);
      }
    }

    return {
      colors,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Anonymize return reasons (PII stripping)
   */
  static anonymizeReturnReasons(reasons: string[]): string[] {
    // Remove potential PII patterns
    const piiPatterns = [
      /\b\d{3}-\d{2}-\d{4}\b/g, // SSN
      /\b\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\b/g, // Credit card
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email
      /\b\d{3}-\d{3}-\d{4}\b/g, // Phone
    ];

    return reasons.map(reason => {
      let anonymized = reason;
      for (const pattern of piiPatterns) {
        anonymized = anonymized.replace(pattern, '[REDACTED]');
      }
      return anonymized;
    });
  }

  /**
   * Filter body-negative language
   */
  static filterBodyNegativeLanguage(text: string): string {
    const negativePhrases = [
      /slim down|lose weight|too fat|too thin|skinny|obese/i,
      /need to lose|should lose|must lose/i,
    ];

    let filtered = text;
    for (const phrase of negativePhrases) {
      if (phrase.test(filtered)) {
        // Replace with neutral language
        filtered = filtered.replace(phrase, 'consider fit options');
      }
    }

    return filtered;
  }
}
