/**
 * Measurement Normalizer
 * Standardizes body measurements for SVM model input
 * Handles unit conversion, missing values, and brand-specific normalization
 */

export interface BodyMeasurements {
  height?: number; // cm
  weight?: number; // kg
  bust?: number; // cm
  chest?: number; // cm
  waist?: number; // cm
  hips?: number; // cm
  inseam?: number; // cm
  shoulder?: number; // cm
  armLength?: number; // cm
  thigh?: number; // cm
  neck?: number; // cm
  sleeve?: number; // cm
  shoeSize?: number; // EU size
}

export interface NormalizedFeatures {
  // Core measurements (7 key features for SVM)
  bust: number;
  waist: number;
  hips: number;
  height: number;
  weight: number;
  inseam: number;
  shoulder: number;
  // Additional features
  bmi: number;
  waistToHipRatio: number;
  chestToWaistRatio: number;
}

export interface BrandSizeMapping {
  brand: string;
  sizeSystem: 'US' | 'EU' | 'UK' | 'JP' | 'AU';
  baseSize: string; // Reference size (e.g., "M" or "8")
  grading: number; // cm per size increment (typically 4-6cm)
  runsSmall?: boolean;
  runsLarge?: boolean;
  trueToSize?: boolean;
}

/**
 * Normalizes body measurements to feature vector for SVM
 */
export class MeasurementNormalizer {
  private readonly DEFAULT_GRADING = 5; // 5cm per size increment
  private readonly MIN_MEASUREMENT = 30; // cm
  private readonly MAX_MEASUREMENT = 200; // cm

  /**
   * Normalize measurements to feature vector
   * Handles missing values with intelligent defaults
   */
  normalize(measurements: BodyMeasurements): NormalizedFeatures {
    // Extract core measurements with defaults
    const bust = this.sanitize(measurements.bust || measurements.chest || this.estimateBust(measurements));
    const waist = this.sanitize(measurements.waist || this.estimateWaist(measurements));
    const hips = this.sanitize(measurements.hips || this.estimateHips(measurements));
    const height = this.sanitize(measurements.height || 170); // Default 170cm
    const weight = this.sanitize(measurements.weight || 65); // Default 65kg
    const inseam = this.sanitize(measurements.inseam || this.estimateInseam(height));
    const shoulder = this.sanitize(measurements.shoulder || this.estimateShoulder(bust));

    // Calculate derived features
    const bmi = weight / Math.pow(height / 100, 2);
    const waistToHipRatio = waist / hips;
    const chestToWaistRatio = bust / waist;

    return {
      bust,
      waist,
      hips,
      height,
      weight,
      inseam,
      shoulder,
      bmi,
      waistToHipRatio,
      chestToWaistRatio,
    };
  }

  /**
   * Get brand-specific size mapping
   */
  getBrandMapping(brand: string): BrandSizeMapping {
    // Brand-specific sizing data from sponsor data
    const brandMappings: Record<string, BrandSizeMapping> = {
      'Zara': {
        brand: 'Zara',
        sizeSystem: 'EU',
        baseSize: 'M',
        grading: 4,
        runsSmall: true,
      },
      'H&M': {
        brand: 'H&M',
        sizeSystem: 'EU',
        baseSize: 'M',
        grading: 5,
        trueToSize: true,
      },
      'ASOS': {
        brand: 'ASOS',
        sizeSystem: 'UK',
        baseSize: '10',
        grading: 5,
        trueToSize: true,
      },
      'Uniqlo': {
        brand: 'Uniqlo',
        sizeSystem: 'JP',
        baseSize: 'M',
        grading: 4,
        runsSmall: true,
      },
      'Everlane': {
        brand: 'Everlane',
        sizeSystem: 'US',
        baseSize: '8',
        grading: 5,
        trueToSize: true,
      },
      'Aritzia': {
        brand: 'Aritzia',
        sizeSystem: 'US',
        baseSize: 'S',
        grading: 4,
        runsSmall: true,
      },
      'Reformation': {
        brand: 'Reformation',
        sizeSystem: 'US',
        baseSize: '4',
        grading: 4,
        runsSmall: true,
      },
      '& Other Stories': {
        brand: '& Other Stories',
        sizeSystem: 'EU',
        baseSize: 'S',
        grading: 4,
        trueToSize: true,
      },
    };

    return brandMappings[brand] || {
      brand,
      sizeSystem: 'US',
      baseSize: 'M',
      grading: this.DEFAULT_GRADING,
      trueToSize: true,
    };
  }

  /**
   * Convert size between systems
   */
  translateSize(
    size: string,
    fromBrand: string,
    toBrand: string
  ): string {
    const fromMapping = this.getBrandMapping(fromBrand);
    const toMapping = this.getBrandMapping(toBrand);

    // Normalize to numeric size first
    const numericSize = this.sizeToNumeric(size, fromMapping.sizeSystem);
    
    // Convert between systems
    const convertedSize = this.convertSizeSystem(numericSize, fromMapping.sizeSystem, toMapping.sizeSystem);
    
    // Apply brand-specific adjustments
    let adjustedSize = convertedSize;
    if (fromMapping.runsSmall && !toMapping.runsSmall) {
      adjustedSize += 1;
    } else if (!fromMapping.runsSmall && toMapping.runsSmall) {
      adjustedSize -= 1;
    }

    return this.numericToSize(adjustedSize, toMapping.sizeSystem);
  }

  /**
   * Sanitize measurement value
   */
  private sanitize(value: number): number {
    return Math.max(this.MIN_MEASUREMENT, Math.min(this.MAX_MEASUREMENT, value));
  }

  /**
   * Estimate bust from other measurements
   */
  private estimateBust(measurements: BodyMeasurements): number {
    if (measurements.chest) return measurements.chest + 5; // Add 5cm for bust
    if (measurements.weight && measurements.height) {
      // Rough estimate: 0.5 * height + 0.3 * weight
      return 0.5 * measurements.height + 0.3 * measurements.weight;
    }
    return 90; // Default
  }

  /**
   * Estimate waist from other measurements
   */
  private estimateWaist(measurements: BodyMeasurements): number {
    if (measurements.hips) return measurements.hips * 0.75; // Waist is typically 75% of hips
    if (measurements.weight && measurements.height) {
      return 0.4 * measurements.height + 0.2 * measurements.weight;
    }
    return 70; // Default
  }

  /**
   * Estimate hips from other measurements
   */
  private estimateHips(measurements: BodyMeasurements): number {
    if (measurements.waist) return measurements.waist / 0.75;
    if (measurements.weight && measurements.height) {
      return 0.5 * measurements.height + 0.4 * measurements.weight;
    }
    return 95; // Default
  }

  /**
   * Estimate inseam from height
   */
  private estimateInseam(height: number): number {
    // Inseam is typically 45-48% of height
    return height * 0.46;
  }

  /**
   * Estimate shoulder width from bust
   */
  private estimateShoulder(bust: number): number {
    // Shoulder width is typically 25-30% of bust
    return bust * 0.28;
  }

  /**
   * Convert size string to numeric
   */
  private sizeToNumeric(size: string, system: string): number {
    // Handle numeric sizes (US 8, UK 10, etc.)
    const numericMatch = size.match(/\d+/);
    if (numericMatch) {
      return parseInt(numericMatch[0], 10);
    }

    // Handle letter sizes
    const letterSizes: Record<string, number> = {
      'XXS': 0, 'XS': 2, 'S': 4, 'M': 6, 'L': 8, 'XL': 10, 'XXL': 12,
    };
    return letterSizes[size.toUpperCase()] || 6; // Default to M
  }

  /**
   * Convert numeric size to size string
   */
  private numericToSize(numeric: number, system: string): string {
    // Round to nearest size
    const rounded = Math.round(numeric);

    // For letter sizes
    if (system === 'US' || system === 'EU') {
      const letterMap: Record<number, string> = {
        0: 'XXS', 2: 'XS', 4: 'S', 6: 'M', 8: 'L', 10: 'XL', 12: 'XXL',
      };
      return letterMap[rounded] || 'M';
    }

    // For numeric sizes
    return rounded.toString();
  }

  /**
   * Convert between size systems
   */
  private convertSizeSystem(size: number, from: string, to: string): number {
    if (from === to) return size;

    // Conversion matrix (approximate)
    // US 8 = EU 38 = UK 10 = JP 11
    const conversions: Record<string, Record<string, number>> = {
      'US': { 'EU': 30, 'UK': 2, 'JP': 3, 'AU': 2 },
      'EU': { 'US': -30, 'UK': -28, 'JP': -27, 'AU': -28 },
      'UK': { 'US': -2, 'EU': 28, 'JP': 1, 'AU': 0 },
      'JP': { 'US': -3, 'EU': 27, 'UK': -1, 'AU': -1 },
    };

    const offset = conversions[from]?.[to] || 0;
    return size + offset;
  }
}

export const measurementNormalizer = new MeasurementNormalizer();
