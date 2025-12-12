/**
 * Test script for Personal Shopper Agent
 * Run with: bun run scripts/test-shopper.ts
 */

import { personalShopperAgent } from '../server/src/services/agents/PersonalShopperAgent.js';

async function testPersonalShopper() {
  console.log('🧪 Testing Personal Shopper Agent\n');

  const testQueries = [
    {
      style: 'business casual',
      budget: 500,
      occasion: 'work',
      userId: 'test-user-1',
      preferredColors: ['navy', 'black', 'white'],
    },
    {
      style: 'casual summer',
      budget: 300,
      occasion: 'beach',
      userId: 'test-user-2',
      preferredColors: ['blue', 'white'],
      measurements: {
        height: 170,
        chest: 95,
        waist: 80,
      },
    },
    {
      style: 'formal elegant',
      budget: 1000,
      occasion: 'wedding',
      userId: 'test-user-3',
    },
  ];

  for (let i = 0; i < testQueries.length; i++) {
    const query = testQueries[i];
    console.log(`\n📦 Test ${i + 1}: ${query.occasion} outfit ($${query.budget})`);
    console.log('─'.repeat(60));

    try {
      const startTime = Date.now();
      const outfits = await personalShopperAgent.curateOutfits(query);
      const duration = Date.now() - startTime;

      console.log(`✅ Generated ${outfits.length} outfit bundles in ${duration}ms\n`);

      outfits.forEach((outfit, index) => {
        console.log(`\n  Bundle ${index + 1}: ${outfit.name}`);
        console.log(`  ├─ Confidence: ${(outfit.confidence * 100).toFixed(1)}%`);
        console.log(`  ├─ Total Cost: $${outfit.totalCost.toFixed(2)}`);
        console.log(`  ├─ Products: ${outfit.products.length}`);
        console.log(`  └─ Reasoning: ${outfit.reasoning.substring(0, 80)}...`);

        outfit.products.forEach((item, itemIndex) => {
          console.log(`     ${itemIndex + 1}. ${item.product.name} (${item.product.brand})`);
          console.log(`        Size: ${item.recommendedSize || 'N/A'}, $${item.product.price}`);
        });
      });
    } catch (error) {
      console.error(`❌ Error:`, error);
    }
  }

  console.log('\n\n✨ Test completed!');
}

// Run tests
testPersonalShopper().catch(console.error);

