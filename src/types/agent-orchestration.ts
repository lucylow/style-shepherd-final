/**
 * Agent Orchestration Types
 * Types for the Supervisor-Orchestrator pattern with multi-agent coordination
 */

export type AgentType = 'personal-shopper' | 'makeup-artist' | 'size-predictor' | 'returns-predictor' | 'orchestrator';

export type UserProfile = {
  id: string;
  displayName?: string;
  heightCm?: number;
  weightKg?: number;
  bustCm?: number;
  waistCm?: number;
  hipsCm?: number;
  skinTone?: string;
  preferences?: string[]; // e.g. ['minimal', 'vintage']
  budget?: number;
};

export type CartItem = {
  id: string;
  sku?: string;
  title: string;
  brand?: string;
  priceCents?: number;
  attributes?: Record<string, any>;
};

export type UserQuery = {
  sessionId?: string; // orchestrator session
  userId?: string;
  text?: string;
  selfieUrl?: string;
  cart?: CartItem[];
  brand?: string;
  measurements?: Partial<UserProfile>;
  occasion?: string;
  meta?: Record<string, any>;
};

export type AgentResponse = {
  id: string;
  sessionId: string;
  agent: AgentType;
  createdAt: string; // ISO
  content: string;
  structured?: Record<string, any>; // e.g. { recommendedSize: 'M', confidence: 0.92 }
  confidence?: number;
  explains?: string[]; // short reasons
  source?: 'mock' | 'vultr' | 'raindrop' | 'local';
};
