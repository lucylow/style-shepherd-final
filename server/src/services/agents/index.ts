/**
 * Agent Services - Multi-Agent Retail System
 * Exports all specialist agents for the agentic retail experience
 */

export { searchAgent, SearchAgent, type Product, type SearchParams, type SearchResult } from './SearchAgent.js';
export { returnsAgent, ReturnsAgent, type ReturnRiskPrediction, type ReturnRiskFactor } from './ReturnsAgent.js';
export { cartAgent, CartAgent, type CartItem, type CartBundle, type CartOptimizationParams } from './CartAgent.js';
export { promotionsAgent, PromotionsAgent, type Promotion, type NegotiationResult } from './PromotionsAgent.js';

// New specialized agents
export { personalShopperAgent, PersonalShopperAgent, type OutfitRecommendationParams, type OutfitRecommendationResult, type OutfitBundle, type UserProfile as PersonalShopperUserProfile } from './PersonalShopperAgent.js';
export { makeupArtistAgent, MakeupArtistAgent, type MakeupRecommendationParams, type MakeupRecommendationResult, type MakeupLook, type SkinToneAnalysis } from './MakeupArtistAgent.js';
export { sizePredictorAgent, SizePredictorAgent, type SizePredictionParams, type SizePredictionResult, type BodyMeasurements } from './SizePredictorAgent.js';
export { returnsPredictorAgent, ReturnsPredictorAgent, type ReturnPredictionParams, type ReturnPredictionResult, type CartItem as ReturnsCartItem } from './ReturnsPredictorAgent.js';

// Orchestrator
export { agentOrchestrator, AgentOrchestrator, type AgentType, type UserQuery, type AgentResponse, type OrchestratedResponse } from './AgentOrchestrator.js';

