/**
 * Health Check Script for Style Shepherd
 * 
 * Validates key endpoints and services are operational
 * 
 * Usage: node scripts/health-check.js
 */

import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

// Load environment variables
try {
  const envFile = join(__dirname, '..', '.env');
  const envContent = readFileSync(envFile, 'utf-8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
        if (!process.env[key.trim()]) {
          process.env[key.trim()] = value;
        }
      }
    }
  });
} catch (e) {
  // .env file not found, use environment variables
}

const API_URL = process.env.API_URL || process.env.VITE_API_URL || 'http://localhost:3001';
const TIMEOUT = 5000; // 5 seconds

const endpoints = [
  {
    name: 'Health Check',
    url: `${API_URL}/health`,
    method: 'GET',
    required: true,
  },
  {
    name: 'API Info',
    url: `${API_URL}/`,
    method: 'GET',
    required: false,
  },
  {
    name: 'Vultr PostgreSQL Health',
    url: `${API_URL}/api/vultr/postgres/health`,
    method: 'GET',
    required: false,
  },
  {
    name: 'Vultr Valkey Health',
    url: `${API_URL}/api/vultr/valkey/health`,
    method: 'GET',
    required: false,
  },
];

async function checkEndpoint(endpoint) {
  const startTime = Date.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

    const response = await fetch(endpoint.url, {
      method: endpoint.method,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    clearTimeout(timeoutId);
    const duration = Date.now() - startTime;

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json().catch(() => ({}));
    
    console.log(`✅ ${endpoint.name}: ${response.status} (${duration}ms)`);
    if (Object.keys(data).length > 0 && Object.keys(data).length < 10) {
      console.log(`   Response: ${JSON.stringify(data).substring(0, 100)}`);
    }
    
    return { success: true, duration, status: response.status };
  } catch (error) {
    const duration = Date.now() - startTime;
    if (error.name === 'AbortError') {
      console.error(`❌ ${endpoint.name}: Timeout after ${TIMEOUT}ms`);
    } else {
      console.error(`❌ ${endpoint.name}: ${error.message} (${duration}ms)`);
    }
    
    if (endpoint.required) {
      return { success: false, duration, error: error.message };
    } else {
      console.log(`   ⚠️  Optional endpoint, continuing...`);
      return { success: true, duration, skipped: true };
    }
  }
}

async function checkEnvironmentVariables() {
  console.log('\n📋 Checking environment variables...');
  
  const requiredVars = [
    'NODE_ENV',
  ];
  
  const optionalVars = [
    'VULTR_POSTGRES_HOST',
    'VULTR_VALKEY_HOST',
    'ELEVENLABS_API_KEY',
    'STRIPE_SECRET_KEY',
    'RAINDROP_API_KEY',
  ];
  
  let allPresent = true;
  
  requiredVars.forEach(varName => {
    if (process.env[varName]) {
      console.log(`✅ ${varName}: Set`);
    } else {
      console.log(`❌ ${varName}: Missing (required)`);
      allPresent = false;
    }
  });
  
  optionalVars.forEach(varName => {
    if (process.env[varName]) {
      console.log(`✅ ${varName}: Set`);
    } else {
      console.log(`⚠️  ${varName}: Not set (optional)`);
    }
  });
  
  return allPresent;
}

async function main() {
  console.log('🏥 Style Shepherd Health Check\n');
  console.log(`API URL: ${API_URL}\n`);
  
  // Check environment variables
  const envCheck = await checkEnvironmentVariables();
  
  // Check endpoints
  console.log('\n🔍 Checking API endpoints...\n');
  
  const results = [];
  for (const endpoint of endpoints) {
    const result = await checkEndpoint(endpoint);
    results.push({ ...endpoint, ...result });
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  // Summary
  console.log('\n📊 Summary:');
  const successful = results.filter(r => r.success && !r.skipped).length;
  const failed = results.filter(r => !r.success && !r.skipped).length;
  const skipped = results.filter(r => r.skipped).length;
  
  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⚠️  Skipped: ${skipped}`);
  
  const requiredFailed = results.filter(r => r.required && !r.success && !r.skipped);
  if (requiredFailed.length > 0) {
    console.log('\n❌ Required endpoints failed:');
    requiredFailed.forEach(r => console.log(`   - ${r.name}`));
    process.exit(1);
  }
  
  if (!envCheck) {
    console.log('\n❌ Required environment variables missing');
    process.exit(1);
  }
  
  console.log('\n✅ All health checks passed!');
  process.exit(0);
}

main().catch(error => {
  console.error('\n💥 Health check failed with error:', error);
  process.exit(1);
});
