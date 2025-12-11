/**
 * Return Risk Prediction Service (Server-side)
 * Predicts probability of product return using 55+ behavioral, product, and transactional features
 */

// Re-export types and service from frontend lib
// In production, you might want to duplicate this code in the server for better separation
export * from '../../../src/lib/returnRiskPrediction.js';
export { ReturnRiskPredictionService } from '../../../src/lib/returnRiskPrediction.js';
