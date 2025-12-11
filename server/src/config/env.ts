/**
 * Environment Configuration
 * Validates and exports all environment variables
 * All service credentials are mandatory for production
 */

import { z } from 'zod';
import * as dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3001'),
  
  // Raindrop Platform (mandatory)
  RAINDROP_API_KEY: z.string().min(1, 'RAINDROP_API_KEY is required'),
  RAINDROP_PROJECT_ID: z.string().min(1, 'RAINDROP_PROJECT_ID is required'),
  RAINDROP_BASE_URL: z.string().url().default('https://platform.raindrop.ai'),
  
  // Vultr Services (mandatory)
  VULTR_POSTGRES_HOST: z.string().min(1, 'VULTR_POSTGRES_HOST is required'),
  VULTR_POSTGRES_PORT: z.string().transform(Number).default('5432'),
  VULTR_POSTGRES_DATABASE: z.string().min(1, 'VULTR_POSTGRES_DATABASE is required'),
  VULTR_POSTGRES_USER: z.string().min(1, 'VULTR_POSTGRES_USER is required'),
  VULTR_POSTGRES_PASSWORD: z.string().min(1, 'VULTR_POSTGRES_PASSWORD is required'),
  VULTR_POSTGRES_SSL: z.string().transform(val => val === 'true').default('false'),
  
  VULTR_VALKEY_HOST: z.string().min(1, 'VULTR_VALKEY_HOST is required'),
  VULTR_VALKEY_PORT: z.string().transform(Number).default('6379'),
  VULTR_VALKEY_PASSWORD: z.string().optional(),
  VULTR_VALKEY_TLS: z.string().transform(val => val === 'true').default('false'),
  
  VULTR_API_ENDPOINT: z.string().url().optional(),
  VULTR_API_KEY: z.string().optional(),
  
  // ElevenLabs (optional - voice AI platform)
  ELEVENLABS_API_KEY: z.string().optional(),
  ELEVEN_LABS_API_KEY: z.string().optional(), // Legacy support
  
  // OpenAI (optional - for LLM and Whisper STT)
  OPENAI_API_KEY: z.string().optional(),
  
  // Cerebras (optional - for LLM inference)
  CEREBRAS_API_KEY: z.string().optional(),
  CEREBRAS_BASE_URL: z.string().url().optional(),
  CEREBRAS_MODEL: z.string().optional(),
  
  // WorkOS (mandatory)
  WORKOS_API_KEY: z.string().min(1, 'WORKOS_API_KEY is required'),
  WORKOS_CLIENT_ID: z.string().min(1, 'WORKOS_CLIENT_ID is required'),
  
  // Stripe (mandatory)
  STRIPE_SECRET_KEY: z.string().min(1, 'STRIPE_SECRET_KEY is required'),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  
  // Fraud Detection
  FRAUD_SCORE_THRESHOLD: z.string().transform(Number).default('0.65'),
  FRAUD_FLAG_THRESHOLD: z.string().transform(Number).default('0.45'),
  FRAUD_MODEL_PATH: z.string().optional(),
  FRAUD_MODEL_ALPHA: z.string().transform(Number).default('0.5'),
  FRAUD_SMS_ALERT_NUMBER: z.string().optional(),
  IPINFO_TOKEN: z.string().optional(),
  EMAILREP_KEY: z.string().optional(),
  BINLIST_KEY: z.string().optional(),
  ADMIN_API_KEY: z.string().optional(),
  ADMIN_TOKEN: z.string().optional(), // For provider admin UI
  SLACK_WEBHOOK_URL: z.string().url().optional(),
  
  // CORS - support multiple origins for Lovable deployment
  CORS_ORIGIN: z.string().default('http://localhost:5173,http://localhost:8080,http://localhost:3000'),
  
  // Supabase (optional - for workflow orchestration)
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  
  // Trend Service (optional - Python FastAPI service)
  TREND_SERVICE_URL: z.string().url().optional().default('http://localhost:8000'),
  TREND_SERVICE_BASE_URL: z.string().url().optional().default('http://localhost:8000'),
  ENABLE_TREND_SERVICE: z.string().transform(val => val === 'true').optional().default('false'),
});

export type Env = z.infer<typeof envSchema>;

let env: Env;

try {
  env = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('❌ Environment validation failed:');
    error.errors.forEach((err) => {
      console.error(`  - ${err.path.join('.')}: ${err.message}`);
    });
    console.error('\n💡 Please ensure all required environment variables are set. See .env.example for reference.');
    process.exit(1);
  }
  throw error;
}

export default env;
