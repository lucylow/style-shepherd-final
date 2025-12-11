/**
 * Routine Builder - Step-by-Step Makeup Generation
 * Creates personalized makeup routines based on skin analysis, occasion, and preferences
 */

import type { SkinAnalysis } from './skin-analyzer.js';

export interface MakeupStep {
  stepNumber: number;
  category: 'base' | 'eyes' | 'lips' | 'cheeks' | 'brows' | 'finishing';
  name: string;
  description: string;
  productType: string; // e.g., "Foundation", "Eyeshadow Palette", "Lipstick"
  shadeRecommendation: string;
  applicationTips: string[];
  estimatedTime: number; // seconds
  videoTimestamp?: number; // for video overlay
}

export interface MakeupRoutine {
  occasion: string;
  style: string; // e.g., "Natural", "Glam", "Bold"
  steps: MakeupStep[];
  totalTime: number; // seconds
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  colorPalette: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

export class RoutineBuilder {
  /**
   * Build a complete makeup routine
   */
  buildRoutine(
    analysis: SkinAnalysis,
    occasion: string,
    preferences?: string[]
  ): MakeupRoutine {
    const occasionStyle = this.getOccasionStyle(occasion);
    const style = this.determineStyle(occasion, preferences);
    const steps = this.generateSteps(analysis, occasion, style, preferences);
    const colorPalette = this.generateColorPalette(analysis, occasion);

    return {
      occasion,
      style,
      steps,
      totalTime: steps.reduce((sum, step) => sum + step.estimatedTime, 0),
      difficulty: this.determineDifficulty(steps),
      colorPalette,
    };
  }

  /**
   * Get style intensity based on occasion
   */
  private getOccasionStyle(occasion: string): 'natural' | 'glam' | 'bold' {
    const lowerOccasion = occasion.toLowerCase();

    if (lowerOccasion.includes('wedding') || lowerOccasion.includes('formal') || lowerOccasion.includes('gala')) {
      return 'glam';
    } else if (lowerOccasion.includes('date') || lowerOccasion.includes('night') || lowerOccasion.includes('party')) {
      return 'glam';
    } else if (lowerOccasion.includes('office') || lowerOccasion.includes('work') || lowerOccasion.includes('professional')) {
      return 'natural';
    } else if (lowerOccasion.includes('bold') || lowerOccasion.includes('dramatic') || lowerOccasion.includes('editorial')) {
      return 'bold';
    } else {
      return 'natural';
    }
  }

  /**
   * Determine overall style
   */
  private determineStyle(
    occasion: string,
    preferences?: string[]
  ): string {
    const occasionStyle = this.getOccasionStyle(occasion);

    if (preferences?.includes('bold lips')) {
      return 'Bold Lips';
    } else if (preferences?.includes('smoky eyes')) {
      return 'Smoky Eyes';
    } else if (preferences?.includes('natural')) {
      return 'Natural';
    } else if (occasionStyle === 'glam') {
      return 'Full Glam';
    } else if (occasionStyle === 'bold') {
      return 'Editorial';
    } else {
      return 'Natural';
    }
  }

  /**
   * Generate makeup steps
   */
  private generateSteps(
    analysis: SkinAnalysis,
    occasion: string,
    style: string,
    preferences?: string[]
  ): MakeupStep[] {
    const steps: MakeupStep[] = [];
    const occasionStyle = this.getOccasionStyle(occasion);
    let stepNumber = 1;
    let videoTimestamp = 0;

    // Step 1: Primer
    steps.push({
      stepNumber: stepNumber++,
      category: 'base',
      name: 'Apply Primer',
      description: 'Prep skin with a hydrating primer for smooth application',
      productType: 'Face Primer',
      shadeRecommendation: 'Universal',
      applicationTips: [
        'Apply in upward motions',
        'Focus on T-zone and areas with visible pores',
        'Allow 30 seconds to set',
      ],
      estimatedTime: 60,
      videoTimestamp: videoTimestamp,
    });
    videoTimestamp += 60;

    // Step 2: Foundation
    const foundationShade = this.getFoundationShade(analysis);
    steps.push({
      stepNumber: stepNumber++,
      category: 'base',
      name: 'Apply Foundation',
      description: `Apply ${foundationShade} foundation for even coverage`,
      productType: 'Foundation',
      shadeRecommendation: foundationShade,
      applicationTips: [
        'Start from center of face and blend outward',
        'Use damp beauty sponge for natural finish',
        'Build coverage gradually',
      ],
      estimatedTime: 120,
      videoTimestamp: videoTimestamp,
    });
    videoTimestamp += 120;

    // Step 3: Concealer
    steps.push({
      stepNumber: stepNumber++,
      category: 'base',
      name: 'Apply Concealer',
      description: 'Conceal under-eye area and any blemishes',
      productType: 'Concealer',
      shadeRecommendation: `${foundationShade} + 1 shade lighter`,
      applicationTips: [
        'Apply in triangle shape under eyes',
        'Blend edges seamlessly',
        'Set with translucent powder',
      ],
      estimatedTime: 90,
      videoTimestamp: videoTimestamp,
    });
    videoTimestamp += 90;

    // Step 4: Brows
    steps.push({
      stepNumber: stepNumber++,
      category: 'brows',
      name: 'Shape Brows',
      description: 'Fill and shape brows to frame the face',
      productType: 'Brow Pencil/Pomade',
      shadeRecommendation: this.getBrowShade(analysis),
      applicationTips: [
        'Follow natural brow shape',
        'Use light, hair-like strokes',
        'Set with clear brow gel',
      ],
      estimatedTime: 120,
      videoTimestamp: videoTimestamp,
    });
    videoTimestamp += 120;

    // Step 5: Eyeshadow Base
    if (occasionStyle !== 'natural') {
      steps.push({
        stepNumber: stepNumber++,
        category: 'eyes',
        name: 'Apply Eyeshadow Base',
        description: 'Prime eyelids for vibrant, long-lasting color',
        productType: 'Eyeshadow Primer',
        shadeRecommendation: 'Universal',
        applicationTips: [
          'Apply from lash line to brow bone',
          'Blend with finger for even coverage',
        ],
        estimatedTime: 45,
        videoTimestamp: videoTimestamp,
      });
      videoTimestamp += 45;
    }

    // Step 6: Eyeshadow
    const eyeshadowPalette = this.getEyeshadowPalette(analysis, occasion, preferences);
    steps.push({
      stepNumber: stepNumber++,
      category: 'eyes',
      name: 'Apply Eyeshadow',
      description: `Create ${style.toLowerCase()} eye look with ${eyeshadowPalette}`,
      productType: 'Eyeshadow Palette',
      shadeRecommendation: eyeshadowPalette,
      applicationTips: this.getEyeshadowTips(occasionStyle, analysis.features.eyeShape),
      estimatedTime: occasionStyle === 'bold' ? 300 : occasionStyle === 'glam' ? 240 : 180,
      videoTimestamp: videoTimestamp,
    });
    videoTimestamp += occasionStyle === 'bold' ? 300 : occasionStyle === 'glam' ? 240 : 180;

    // Step 7: Eyeliner
    if (occasionStyle !== 'natural') {
      steps.push({
        stepNumber: stepNumber++,
        category: 'eyes',
        name: 'Apply Eyeliner',
        description: 'Define eyes with precise liner',
        productType: 'Eyeliner',
        shadeRecommendation: occasionStyle === 'bold' ? 'Black' : 'Brown/Black',
        applicationTips: this.getEyelinerTips(analysis.features.eyeShape),
        estimatedTime: 120,
        videoTimestamp: videoTimestamp,
      });
      videoTimestamp += 120;
    }

    // Step 8: Mascara
    steps.push({
      stepNumber: stepNumber++,
      category: 'eyes',
      name: 'Apply Mascara',
      description: 'Lengthen and volumize lashes',
      productType: 'Mascara',
      shadeRecommendation: 'Black',
      applicationTips: [
        'Wiggle wand from roots to tips',
        'Apply 2-3 coats for desired volume',
        'Curl lashes before applying for lift',
      ],
      estimatedTime: 90,
      videoTimestamp: videoTimestamp,
    });
    videoTimestamp += 90;

    // Step 9: Blush
    const blushShade = this.getBlushShade(analysis, occasion);
    steps.push({
      stepNumber: stepNumber++,
      category: 'cheeks',
      name: 'Apply Blush',
      description: `Add ${blushShade} blush for healthy glow`,
      productType: 'Blush',
      shadeRecommendation: blushShade,
      applicationTips: [
        'Smile and apply to apples of cheeks',
        'Blend upward toward temples',
        'Build color gradually',
      ],
      estimatedTime: 60,
      videoTimestamp: videoTimestamp,
    });
    videoTimestamp += 60;

    // Step 10: Highlighter
    if (occasionStyle !== 'natural') {
      steps.push({
        stepNumber: stepNumber++,
        category: 'cheeks',
        name: 'Apply Highlighter',
        description: 'Add luminous glow to high points',
        productType: 'Highlighter',
        shadeRecommendation: this.getHighlighterShade(analysis),
        applicationTips: [
          'Apply to cheekbones, nose bridge, cupid\'s bow',
          'Use light, tapping motions',
          'Blend edges for seamless glow',
        ],
        estimatedTime: 45,
        videoTimestamp: videoTimestamp,
      });
      videoTimestamp += 45;
    }

    // Step 11: Lip Liner
    if (preferences?.includes('bold lips') || occasionStyle === 'glam' || occasionStyle === 'bold') {
      steps.push({
        stepNumber: stepNumber++,
        category: 'lips',
        name: 'Line Lips',
        description: 'Define lip shape with liner',
        productType: 'Lip Liner',
        shadeRecommendation: this.getLipShade(analysis, occasion, preferences),
        applicationTips: [
          'Start from cupid\'s bow',
          'Follow natural lip line',
          'Fill in slightly for longer wear',
        ],
        estimatedTime: 60,
        videoTimestamp: videoTimestamp,
      });
      videoTimestamp += 60;
    }

    // Step 12: Lipstick
    const lipShade = this.getLipShade(analysis, occasion, preferences);
    steps.push({
      stepNumber: stepNumber++,
      category: 'lips',
      name: 'Apply Lipstick',
      description: `Complete look with ${lipShade} lip color`,
      productType: 'Lipstick',
      shadeRecommendation: lipShade,
      applicationTips: this.getLipApplicationTips(analysis.features.lipFullness),
      estimatedTime: 60,
      videoTimestamp: videoTimestamp,
    });
    videoTimestamp += 60;

    // Step 13: Setting Spray
    steps.push({
      stepNumber: stepNumber++,
      category: 'finishing',
      name: 'Set Makeup',
      description: 'Lock in your look with setting spray',
      productType: 'Setting Spray',
      shadeRecommendation: 'Universal',
      applicationTips: [
        'Hold 8-10 inches from face',
        'Spray in X and T motions',
        'Allow to dry naturally',
      ],
      estimatedTime: 30,
      videoTimestamp: videoTimestamp,
    });

    return steps;
  }

  /**
   * Get foundation shade recommendation
   */
  private getFoundationShade(analysis: SkinAnalysis): string {
    const { fitzpatrickScale, undertone } = analysis.skinTone;

    // Map Fitzpatrick scale + undertone to common shade systems
    const shadeMap: Record<string, Record<number, string>> = {
      warm: {
        1: 'NC15',
        2: 'NC20',
        3: 'NC25',
        4: 'NC30',
        5: 'NC35',
        6: 'NC40',
      },
      cool: {
        1: 'NW15',
        2: 'NW20',
        3: 'NW25',
        4: 'NW30',
        5: 'NW35',
        6: 'NW40',
      },
      neutral: {
        1: 'N15',
        2: 'N20',
        3: 'N25',
        4: 'N30',
        5: 'N35',
        6: 'N40',
      },
    };

    return shadeMap[undertone]?.[fitzpatrickScale] || `Shade ${fitzpatrickScale}`;
  }

  /**
   * Get brow shade
   */
  private getBrowShade(analysis: SkinAnalysis): string {
    const scale = analysis.skinTone.fitzpatrickScale;
    if (scale <= 2) return 'Light Brown';
    if (scale <= 4) return 'Medium Brown';
    return 'Dark Brown/Black';
  }

  /**
   * Get eyeshadow palette recommendation
   */
  private getEyeshadowPalette(
    analysis: SkinAnalysis,
    occasion: string,
    preferences?: string[]
  ): string {
    const occasionStyle = this.getOccasionStyle(occasion);
    const { undertone } = analysis.skinTone;

    if (preferences?.includes('smoky eyes')) {
      return 'Neutral Smoky Palette';
    }

    if (occasionStyle === 'bold') {
      return undertone === 'warm' ? 'Warm Bold Palette' : 'Cool Bold Palette';
    } else if (occasionStyle === 'glam') {
      return undertone === 'warm' ? 'Warm Glam Palette' : 'Cool Glam Palette';
    } else {
      return undertone === 'warm' ? 'Warm Neutral Palette' : 'Cool Neutral Palette';
    }
  }

  /**
   * Get eyeshadow application tips
   */
  private getEyeshadowTips(
    style: 'natural' | 'glam' | 'bold',
    eyeShape: string
  ): string[] {
    const baseTips = [
      'Apply transition shade in crease',
      'Blend edges for seamless look',
    ];

    if (style === 'glam') {
      baseTips.push('Build intensity gradually', 'Use darker shades in outer corner');
    } else if (style === 'bold') {
      baseTips.push('Pack color on lid', 'Use multiple shades for depth');
    }

    if (eyeShape === 'hooded') {
      baseTips.push('Apply shadow above crease for visibility');
    } else if (eyeShape === 'monolid') {
      baseTips.push('Focus color on center of lid');
    }

    return baseTips;
  }

  /**
   * Get eyeliner tips based on eye shape
   */
  private getEyelinerTips(eyeShape: string): string[] {
    const tips: Record<string, string[]> = {
      almond: ['Follow natural lash line', 'Extend slightly past outer corner'],
      round: ['Keep line thin on inner corner', 'Widen toward outer corner'],
      hooded: ['Keep line thin', 'Wing upward to lift eyes'],
      monolid: ['Create thicker line', 'Extend wing for definition'],
      downturned: ['Wing upward to counteract droop', 'Keep inner corner minimal'],
      upturned: ['Follow natural upward curve', 'Balance with subtle wing'],
    };

    return tips[eyeShape] || tips.almond;
  }

  /**
   * Get blush shade
   */
  private getBlushShade(analysis: SkinAnalysis, occasion: string): string {
    const { undertone, fitzpatrickScale } = analysis.skinTone;
    const occasionStyle = this.getOccasionStyle(occasion);

    if (undertone === 'warm') {
      if (fitzpatrickScale <= 3) {
        return occasionStyle === 'glam' ? 'Peachy Pink' : 'Soft Peach';
      } else {
        return occasionStyle === 'glam' ? 'Coral' : 'Warm Rose';
      }
    } else {
      if (fitzpatrickScale <= 3) {
        return occasionStyle === 'glam' ? 'Pink' : 'Soft Pink';
      } else {
        return occasionStyle === 'glam' ? 'Berry' : 'Rose';
      }
    }
  }

  /**
   * Get highlighter shade
   */
  private getHighlighterShade(analysis: SkinAnalysis): string {
    const scale = analysis.skinTone.fitzpatrickScale;
    if (scale <= 2) return 'Pearl/Ivory';
    if (scale <= 4) return 'Champagne';
    return 'Gold/Bronze';
  }

  /**
   * Get lip shade
   */
  private getLipShade(
    analysis: SkinAnalysis,
    occasion: string,
    preferences?: string[]
  ): string {
    const { undertone, fitzpatrickScale } = analysis.skinTone;
    const occasionStyle = this.getOccasionStyle(occasion);

    if (preferences?.includes('bold lips')) {
      return undertone === 'warm' ? 'Classic Red' : 'Blue-Red';
    }

    if (occasionStyle === 'bold') {
      return undertone === 'warm' ? 'Deep Red' : 'Berry';
    } else if (occasionStyle === 'glam') {
      return undertone === 'warm' ? 'Red' : 'Pink-Red';
    } else {
      if (fitzpatrickScale <= 3) {
        return undertone === 'warm' ? 'Nude Peach' : 'Nude Pink';
      } else {
        return undertone === 'warm' ? 'Mauve' : 'Rose';
      }
    }
  }

  /**
   * Get lip application tips
   */
  private getLipApplicationTips(lipFullness: number): string[] {
    if (lipFullness < 0.4) {
      return [
        'Overline slightly for fuller appearance',
        'Use lighter shade in center',
        'Blend edges for natural look',
      ];
    } else if (lipFullness > 0.7) {
      return [
        'Follow natural lip line precisely',
        'Use lip liner to define shape',
        'Blot and reapply for longevity',
      ];
    } else {
      return [
        'Apply from center outward',
        'Blend edges with finger',
        'Layer for intensity',
      ];
    }
  }

  /**
   * Generate color palette
   */
  private generateColorPalette(
    analysis: SkinAnalysis,
    occasion: string
  ): MakeupRoutine['colorPalette'] {
    const { undertone } = analysis.skinTone;
    const occasionStyle = this.getOccasionStyle(occasion);

    if (undertone === 'warm') {
      if (occasionStyle === 'glam') {
        return { primary: 'Gold', secondary: 'Peach', accent: 'Coral' };
      } else if (occasionStyle === 'bold') {
        return { primary: 'Amber', secondary: 'Rust', accent: 'Burgundy' };
      } else {
        return { primary: 'Beige', secondary: 'Peach', accent: 'Coral' };
      }
    } else {
      if (occasionStyle === 'glam') {
        return { primary: 'Rose Gold', secondary: 'Pink', accent: 'Berry' };
      } else if (occasionStyle === 'bold') {
        return { primary: 'Plum', secondary: 'Berry', accent: 'Wine' };
      } else {
        return { primary: 'Taupe', secondary: 'Pink', accent: 'Rose' };
      }
    }
  }

  /**
   * Determine difficulty level
   */
  private determineDifficulty(steps: MakeupStep[]): 'beginner' | 'intermediate' | 'advanced' {
    const complexSteps = steps.filter(
      step => step.category === 'eyes' && step.estimatedTime > 180
    ).length;

    if (complexSteps >= 2) return 'advanced';
    if (complexSteps >= 1 || steps.length > 10) return 'intermediate';
    return 'beginner';
  }
}

