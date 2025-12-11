/**
 * Skin Analyzer - Computer Vision Processing
 * Analyzes selfies to detect skin tone, undertone, face shape, and features
 * Uses client-side processing for privacy (Transformers.js) or server-side (MediaPipe)
 */

export interface SkinAnalysis {
  skinTone: {
    fitzpatrickScale: number; // 1-6
    rgb: { r: number; g: number; b: number };
    hsv: { h: number; s: number; v: number };
    label: string; // e.g., "Light", "Medium", "Deep"
  };
  undertone: 'warm' | 'cool' | 'neutral';
  faceShape: 'oval' | 'round' | 'square' | 'heart' | 'diamond' | 'oblong';
  features: {
    eyeShape: 'almond' | 'round' | 'hooded' | 'monolid' | 'downturned' | 'upturned';
    lipFullness: number; // 0-1 scale
    faceOvality: number; // 0-1 scale (1 = perfect oval)
    cheekboneProminence: number; // 0-1 scale
  };
  confidence: number; // 0-1
}

export interface FaceLandmarks {
  face: {
    width: number;
    height: number;
    center: { x: number; y: number };
  };
  eyes: {
    left: { x: number; y: number; width: number; height: number };
    right: { x: number; y: number; width: number; height: number };
  };
  nose: { x: number; y: number; width: number; height: number };
  mouth: { x: number; y: number; width: number; height: number };
  jawline: Array<{ x: number; y: number }>;
  cheekbones: Array<{ x: number; y: number }>;
}

export class SkinAnalyzer {
  /**
   * Analyze selfie image to extract skin and facial features
   * @param imageUrl - URL or base64 data URL of the selfie
   * @returns Skin analysis results
   */
  async analyzeSelfie(imageUrl: string): Promise<SkinAnalysis> {
    try {
      // In production, this would:
      // 1. Load image from URL
      // 2. Use MediaPipe FaceMesh or Transformers.js for landmark detection
      // 3. Extract skin tone from facial regions
      // 4. Calculate face shape from landmarks
      // 5. Analyze features

      // For now, simulate analysis with intelligent defaults
      // In production, replace with actual vision processing
      const landmarks = await this.detectLandmarks(imageUrl);
      const skinTone = await this.analyzeSkinTone(imageUrl, landmarks);
      const undertone = await this.determineUndertone(skinTone);
      const faceShape = await this.determineFaceShape(landmarks);
      const features = await this.analyzeFeatures(landmarks);

      return {
        skinTone,
        undertone,
        faceShape,
        features,
        confidence: 0.85, // Simulated confidence
      };
    } catch (error) {
      console.error('Skin analysis failed:', error);
      // Return default analysis as fallback
      return this.getDefaultAnalysis();
    }
  }

  /**
   * Detect facial landmarks (simulated - replace with actual vision model)
   */
  private async detectLandmarks(imageUrl: string): Promise<FaceLandmarks> {
    // In production: Use MediaPipe FaceMesh or Transformers.js
    // For now, return simulated landmarks
    return {
      face: {
        width: 400,
        height: 500,
        center: { x: 200, y: 250 },
      },
      eyes: {
        left: { x: 150, y: 180, width: 30, height: 20 },
        right: { x: 250, y: 180, width: 30, height: 20 },
      },
      nose: { x: 200, y: 240, width: 30, height: 40 },
      mouth: { x: 200, y: 300, width: 50, height: 20 },
      jawline: [
        { x: 120, y: 400 },
        { x: 200, y: 450 },
        { x: 280, y: 400 },
      ],
      cheekbones: [
        { x: 130, y: 200 },
        { x: 270, y: 200 },
      ],
    };
  }

  /**
   * Analyze skin tone from facial regions
   */
  private async analyzeSkinTone(
    imageUrl: string,
    landmarks: FaceLandmarks
  ): Promise<SkinAnalysis['skinTone']> {
    // In production: Extract RGB from cheek/forehead regions
    // For now, simulate with random but realistic values
    const baseR = 180 + Math.random() * 50;
    const baseG = 150 + Math.random() * 40;
    const baseB = 130 + Math.random() * 30;

    const rgb = {
      r: Math.round(baseR),
      g: Math.round(baseG),
      b: Math.round(baseB),
    };

    // Convert to HSV
    const hsv = this.rgbToHsv(rgb.r, rgb.g, rgb.b);

    // Determine Fitzpatrick scale (1-6)
    const fitzpatrickScale = this.calculateFitzpatrickScale(rgb, hsv);
    const label = this.getFitzpatrickLabel(fitzpatrickScale);

    return {
      fitzpatrickScale,
      rgb,
      hsv,
      label,
    };
  }

  /**
   * Determine skin undertone (warm/cool/neutral)
   */
  private async determineUndertone(
    skinTone: SkinAnalysis['skinTone']
  ): Promise<'warm' | 'cool' | 'neutral'> {
    const { h, s } = skinTone.hsv;

    // Warm undertones: yellow/golden (hue 20-60)
    // Cool undertones: pink/blue (hue 300-360 or 0-20)
    // Neutral: in between

    if (h >= 20 && h <= 60 && s > 0.3) {
      return 'warm';
    } else if ((h >= 300 || h <= 20) && s > 0.3) {
      return 'cool';
    } else {
      return 'neutral';
    }
  }

  /**
   * Determine face shape from landmarks
   */
  private async determineFaceShape(
    landmarks: FaceLandmarks
  ): Promise<SkinAnalysis['faceShape']> {
    const { face, jawline } = landmarks;
    const faceRatio = face.width / face.height;

    // Calculate jawline width vs face width
    const jawWidth = Math.abs(jawline[2].x - jawline[0].x);
    const jawRatio = jawWidth / face.width;

    // Calculate cheekbone prominence
    const cheekWidth = Math.abs(
      landmarks.cheekbones[1].x - landmarks.cheekbones[0].x
    );
    const cheekRatio = cheekWidth / face.width;

    // Determine shape based on ratios
    if (faceRatio > 0.75 && jawRatio > 0.9) {
      return 'round';
    } else if (faceRatio < 0.7) {
      return 'oblong';
    } else if (jawRatio > 0.95 && cheekRatio < 0.85) {
      return 'square';
    } else if (cheekRatio > 0.9 && jawRatio < 0.7) {
      return 'heart';
    } else if (cheekRatio > 0.95) {
      return 'diamond';
    } else {
      return 'oval'; // Default
    }
  }

  /**
   * Analyze facial features
   */
  private async analyzeFeatures(
    landmarks: FaceLandmarks
  ): Promise<SkinAnalysis['features']> {
    const { eyes, mouth, face } = landmarks;

    // Eye shape analysis
    const eyeWidth = eyes.right.x - eyes.left.x;
    const eyeHeight = (eyes.left.height + eyes.right.height) / 2;
    const eyeRatio = eyeWidth / eyeHeight;

    let eyeShape: SkinAnalysis['features']['eyeShape'] = 'almond';
    if (eyeRatio > 2.5) {
      eyeShape = 'round';
    } else if (eyeRatio < 1.5) {
      eyeShape = 'monolid';
    }

    // Lip fullness (mouth width vs face width)
    const lipFullness = Math.min(mouth.width / face.width, 1);

    // Face ovality (how close to perfect oval)
    const faceOvality = Math.min(
      Math.abs(face.width / face.height - 0.75) < 0.1 ? 1 : 0.7,
      1
    );

    // Cheekbone prominence
    const cheekboneProminence = Math.min(
      (landmarks.cheekbones[1].x - landmarks.cheekbones[0].x) / face.width,
      1
    );

    return {
      eyeShape,
      lipFullness,
      faceOvality,
      cheekboneProminence,
    };
  }

  /**
   * Convert RGB to HSV
   */
  private rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;

    let h = 0;
    if (delta !== 0) {
      if (max === r) {
        h = ((g - b) / delta) % 6;
      } else if (max === g) {
        h = (b - r) / delta + 2;
      } else {
        h = (r - g) / delta + 4;
      }
    }
    h = Math.round(h * 60);
    if (h < 0) h += 360;

    const s = max === 0 ? 0 : delta / max;
    const v = max;

    return { h, s, v };
  }

  /**
   * Calculate Fitzpatrick scale from RGB/HSV
   */
  private calculateFitzpatrickScale(
    rgb: { r: number; g: number; b: number },
    hsv: { h: number; s: number; v: number }
  ): number {
    // Simplified calculation based on brightness and saturation
    const brightness = (rgb.r + rgb.g + rgb.b) / 3;

    if (brightness > 220) return 1; // Very light
    if (brightness > 200) return 2; // Light
    if (brightness > 180) return 3; // Medium-light
    if (brightness > 150) return 4; // Medium
    if (brightness > 120) return 5; // Medium-dark
    return 6; // Dark
  }

  /**
   * Get human-readable Fitzpatrick label
   */
  private getFitzpatrickLabel(scale: number): string {
    const labels: Record<number, string> = {
      1: 'Very Light',
      2: 'Light',
      3: 'Medium-Light',
      4: 'Medium',
      5: 'Medium-Dark',
      6: 'Dark',
    };
    return labels[scale] || 'Medium';
  }

  /**
   * Get default analysis as fallback
   */
  private getDefaultAnalysis(): SkinAnalysis {
    return {
      skinTone: {
        fitzpatrickScale: 3,
        rgb: { r: 200, g: 170, b: 150 },
        hsv: { h: 30, s: 0.25, v: 0.78 },
        label: 'Medium-Light',
      },
      undertone: 'neutral',
      faceShape: 'oval',
      features: {
        eyeShape: 'almond',
        lipFullness: 0.5,
        faceOvality: 0.8,
        cheekboneProminence: 0.6,
      },
      confidence: 0.5,
    };
  }
}
