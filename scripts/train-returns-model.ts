/**
 * Training Script for Returns Predictor ML Model
 * 
 * This script trains the XGBoost model on historical return data.
 * 
 * Usage:
 *   bun run scripts/train-returns-model.ts
 * 
 * Note: In production, this would:
 * 1. Load training data from database (orders + returns)
 * 2. Extract features for each order
 * 3. Train XGBoost model (via Python service or xgboost-js)
 * 4. Validate on test set (target: 0.85 AUC)
 * 5. Save model weights or export model file
 * 6. Update MLClassifier with new weights
 * 
 * Current implementation uses feature-weighted approach that approximates XGBoost.
 * For production XGBoost integration, consider:
 * - Python microservice with XGBoost
 * - XGBoost API (hosted ML service)
 * - xgboost-js (Node.js port - may have limitations)
 */

import { orderSQL } from '../server/src/lib/raindrop-config.js';
import { featureExtractor } from '../server/src/services/agents/returns-predictor/feature-extractor.js';
import { mlClassifier } from '../server/src/services/agents/returns-predictor/ml-classifier.js';

async function trainModel() {
  console.log('🚀 Starting Returns Predictor Model Training...\n');

  try {
    // Step 1: Load training data from database
    console.log('📊 Loading training data from database...');
    
    if (!orderSQL || !orderSQL.query) {
      console.warn('⚠️  Database not available - using mock training data');
      // In production, load real data
      return;
    }

    const orders = await orderSQL.query(
      `SELECT * FROM orders ORDER BY created_at DESC LIMIT 10000`
    );
    
    const returns = await orderSQL.query(
      `SELECT * FROM returns`
    );

    console.log(`✅ Loaded ${orders.length} orders and ${returns.length} returns\n`);

    // Step 2: Extract features and labels
    console.log('🔧 Extracting features...');
    const trainingData: Array<{ features: any; label: number }> = [];

    for (const order of orders) {
      const items = Array.isArray(order.items) ? order.items : JSON.parse(order.items || '[]');
      const userId = order.user_id;

      for (const item of items) {
        // Build cart item structure
        const cartItem = {
          product: {
            id: item.product_id || item.id,
            name: item.name || 'Unknown',
            brand: item.brand || 'Unknown',
            price: item.price || 0,
            category: item.category || 'unknown',
            description: item.description || '',
            rating: item.rating,
            reviews: item.reviews || [],
          },
          quantity: item.quantity || 1,
          size: item.size,
        };

        // Get user history and profile
        const userHistory = await featureExtractor.getUserReturnHistory(userId);
        const userProfile = await featureExtractor.buildUserReturnProfile(userId);

        // Extract features
        const features = await featureExtractor.extractFeatures(
          cartItem,
          userHistory,
          userProfile
        );

        // Label: 1 if returned, 0 if kept
        const wasReturned = returns.some((r: any) => 
          r.order_id === order.order_id && 
          (r.product_id === item.product_id || r.product_id === item.id)
        );

        trainingData.push({
          features,
          label: wasReturned ? 1 : 0,
        });
      }
    }

    console.log(`✅ Extracted features for ${trainingData.length} training samples\n`);

    // Step 3: Train model
    console.log('🤖 Training XGBoost model...');
    const metrics = await mlClassifier.train(trainingData);

    console.log('\n📈 Training Results:');
    console.log(`   AUC: ${metrics.auc.toFixed(3)} (target: 0.85)`);
    console.log(`   Accuracy: ${(metrics.accuracy * 100).toFixed(1)}%`);
    console.log(`   Precision: ${(metrics.precision * 100).toFixed(1)}%`);
    console.log(`   Recall: ${(metrics.recall * 100).toFixed(1)}%\n`);

    if (metrics.auc >= 0.85) {
      console.log('✅ Model meets target AUC of 0.85!');
    } else {
      console.log('⚠️  Model AUC below target - consider tuning hyperparameters');
    }

    console.log('\n✅ Training complete!');
    console.log('💡 Note: Current implementation uses feature-weighted approach.');
    console.log('   For production XGBoost, integrate with Python service or XGBoost API.');

  } catch (error) {
    console.error('❌ Training failed:', error);
    throw error;
  }
}

// Run training
trainModel().catch(console.error);

