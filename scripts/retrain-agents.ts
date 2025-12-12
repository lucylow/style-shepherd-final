/**
 * AI Agent Retraining Script
 * 
 * Retrains AI models for voice agents, recommendation systems, and size prediction
 * 
 * Usage: 
 *   npm run retrain:agents
 *   or: npx tsx scripts/retrain-agents.ts
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface RetrainConfig {
  models: {
    name: string;
    script: string;
    enabled: boolean;
    description: string;
  }[];
}

async function retrainModel(model: { name: string; script: string; enabled: boolean; description: string }) {
  if (!model.enabled) {
    console.log(`⏭️  Skipping ${model.name} (disabled)`);
    return { success: true, skipped: true };
  }

  console.log(`\n🔄 Retraining ${model.name}...`);
  console.log(`   ${model.description}`);
  
  try {
    // Import and run the training script dynamically
    const scriptPath = join(__dirname, model.script);
    
    // For TypeScript files, we'd need tsx or ts-node
    // For now, we'll use a subprocess approach
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    // Determine the runner based on file extension
    const isTS = model.script.endsWith('.ts');
    const runner = isTS ? 'npx tsx' : 'node';
    const command = `${runner} ${scriptPath}`;
    
    console.log(`   Running: ${command}`);
    
    const { stdout, stderr } = await execAsync(command, {
      cwd: join(__dirname, '..'),
      env: process.env,
    });
    
    if (stdout) console.log(stdout);
    if (stderr && !stderr.includes('warning')) console.error(stderr);
    
    console.log(`✅ ${model.name} retrained successfully`);
    return { success: true, skipped: false };
  } catch (error: any) {
    console.error(`❌ Failed to retrain ${model.name}:`, error.message);
    return { success: false, skipped: false, error: error.message };
  }
}

async function main() {
  console.log('🤖 Style Shepherd AI Agent Retraining\n');
  
  const config: RetrainConfig = {
    models: [
      {
        name: 'Size Prediction Models',
        script: 'train-size-models.ts',
        enabled: true,
        description: 'Retrains size prediction models for cross-brand sizing',
      },
      {
        name: 'Return Risk Prediction Model',
        script: 'train-returns-model.ts',
        enabled: true,
        description: 'Retrains return risk classifier using latest transaction data',
      },
      {
        name: 'Product Embeddings',
        script: '../scripts/compute_product_embeddings.js',
        enabled: true,
        description: 'Updates product embeddings for recommendation system',
      },
    ],
  };
  
  const results = [];
  
  for (const model of config.models) {
    const result = await retrainModel(model);
    results.push({ ...model, ...result });
    
    // Small delay between training runs
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Summary
  console.log('\n📊 Retraining Summary:');
  const successful = results.filter(r => r.success && !r.skipped).length;
  const failed = results.filter(r => !r.success).length;
  const skipped = results.filter(r => r.skipped).length;
  
  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⏭️  Skipped: ${skipped}`);
  
  if (failed > 0) {
    console.log('\n❌ Some models failed to retrain:');
    results
      .filter(r => !r.success)
      .forEach(r => console.log(`   - ${r.name}: ${r.error || 'Unknown error'}`));
    process.exit(1);
  }
  
  console.log('\n✅ All enabled models retrained successfully!');
  process.exit(0);
}

main().catch(error => {
  console.error('\n💥 Retraining failed with error:', error);
  process.exit(1);
});
