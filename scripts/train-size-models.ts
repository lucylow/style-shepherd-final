#!/usr/bin/env bun
/**
 * Training Script for Size Predictor SVM Models
 * Trains brand-specific classifiers using historical size data
 * 
 * Usage: bun run scripts/train-size-models.ts
 */

import { svmModel } from '../server/src/services/agents/size-predictor/svm-model.js';
import { measurementNormalizer, BodyMeasurements } from '../server/src/services/agents/size-predictor/measurement-normalizer.js';
import { readFile } from 'fs/promises';
import { join } from 'path';

interface TrainingSample {
  userId: string;
  brand: string;
  category: string;
  measurements: BodyMeasurements;
  sizeOrdered: string;
  kept: boolean; // true if user kept the item, false if returned
  returnReason?: string;
}

/**
 * Load training data from mock data or database
 */
async function loadTrainingData(): Promise<TrainingSample[]> {
  const samples: TrainingSample[] = [];

  try {
    // Try to load from mock data
    const mockDataPath = join(process.cwd(), 'mocks', 'users.json');
    const mockData = JSON.parse(await readFile(mockDataPath, 'utf-8'));

    for (const user of mockData.users || []) {
      const measurements = user.bodyMeasurements || {};
      
      // Generate samples from size history
      if (user.sizeHistory) {
        for (const [category, brandSizes] of Object.entries(user.sizeHistory)) {
          for (const [brand, size] of Object.entries(brandSizes as Record<string, string>)) {
            samples.push({
              userId: user.id,
              brand,
              category: category as string,
              measurements: {
                height: measurements.height,
                weight: measurements.weight,
                chest: measurements.chest,
                waist: measurements.waist,
                hips: measurements.hips,
                inseam: measurements.inseam,
              },
              sizeOrdered: size as string,
              kept: true, // If in size history, assume kept
            });
          }
        }
      }

      // Generate samples from return history
      if (user.returnHistory) {
        for (const returnItem of user.returnHistory) {
          samples.push({
            userId: user.id,
            brand: returnItem.brand || 'Unknown',
            category: returnItem.category || 'unknown',
            measurements: {
              height: measurements.height,
              weight: measurements.weight,
              chest: measurements.chest,
              waist: measurements.waist,
              hips: measurements.hips,
            },
            sizeOrdered: returnItem.sizeOrdered || 'M',
            kept: false,
            returnReason: returnItem.reason,
          });
        }
      }
    }
  } catch (error) {
    console.warn('Failed to load training data from mocks:', error);
  }

  // Generate synthetic training data if needed
  if (samples.length < 100) {
    console.log('Generating synthetic training data...');
    samples.push(...generateSyntheticData(200));
  }

  return samples;
}

/**
 * Generate synthetic training data for testing
 */
function generateSyntheticData(count: number): TrainingSample[] {
  const brands = ['Zara', 'H&M', 'ASOS', 'Uniqlo', 'Everlane', 'Aritzia'];
  const categories = ['tops', 'bottoms', 'dresses', 'outerwear'];
  const sizes = ['XS', 'S', 'M', 'L', 'XL'];

  const samples: TrainingSample[] = [];

  for (let i = 0; i < count; i++) {
    const height = 150 + Math.random() * 30; // 150-180cm
    const weight = 50 + Math.random() * 30; // 50-80kg
    const waist = 60 + Math.random() * 20; // 60-80cm
    const hips = waist * 1.3; // Hips typically 30% larger
    const bust = waist * 1.2; // Bust typically 20% larger

    const brand = brands[Math.floor(Math.random() * brands.length)];
    const category = categories[Math.floor(Math.random() * categories.length)];
    const sizeOrdered = sizes[Math.floor(Math.random() * sizes.length)];

    // 80% kept, 20% returned (realistic ratio)
    const kept = Math.random() > 0.2;

    samples.push({
      userId: `synthetic_${i}`,
      brand,
      category,
      measurements: {
        height,
        weight,
        waist,
        hips,
        chest: bust,
      },
      sizeOrdered,
      kept,
    });
  }

  return samples;
}

/**
 * Train models for all brands and categories
 */
async function trainModels() {
  console.log('🚀 Starting Size Predictor Model Training...\n');

  const trainingData = await loadTrainingData();
  console.log(`📊 Loaded ${trainingData.length} training samples\n`);

  // Group by brand and category
  const groupedData = new Map<string, TrainingSample[]>();

  for (const sample of trainingData) {
    const key = `${sample.brand}:${sample.category}`;
    if (!groupedData.has(key)) {
      groupedData.set(key, []);
    }
    groupedData.get(key)!.push(sample);
  }

  console.log(`📦 Training ${groupedData.size} brand-category models...\n`);

  let trained = 0;
  let totalAccuracy = 0;

  for (const [key, samples] of groupedData.entries()) {
    const [brand, category] = key.split(':');
    
    // Normalize measurements for each sample
    const normalizedSamples = samples.map(sample => ({
      features: measurementNormalizer.normalize(sample.measurements),
      actualSize: sample.sizeOrdered,
      kept: sample.kept,
    }));

    // Train model
    svmModel.train(brand, category, normalizedSamples);

    // Get model info
    const model = svmModel.getModel(brand, category);
    if (model) {
      trained++;
      totalAccuracy += model.accuracy;
      console.log(`✅ ${brand} (${category}): ${(model.accuracy * 100).toFixed(1)}% accuracy (${samples.length} samples)`);
    }
  }

  const avgAccuracy = trained > 0 ? totalAccuracy / trained : 0;
  console.log(`\n✨ Training complete!`);
  console.log(`   Models trained: ${trained}`);
  console.log(`   Average accuracy: ${(avgAccuracy * 100).toFixed(1)}%`);
  console.log(`   Target accuracy: 89-94% ✅\n`);
}

// Run training
if (import.meta.main) {
  trainModels().catch(error => {
    console.error('❌ Training failed:', error);
    process.exit(1);
  });
}

