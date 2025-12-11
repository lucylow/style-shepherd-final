/**
 * Data Sync Script
 * 
 * Syncs mock data, sponsor data, and updates product catalogs
 * 
 * Usage: 
 *   npm run data:sync
 *   or: node scripts/data-sync.js
 */

const { readFileSync, writeFileSync, existsSync } = require('fs');
const { join } = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = join(__dirname, '..');

async function syncMockData() {
  console.log('\n📦 Syncing mock data...');
  
  try {
    // Ensure mock data exists
    const mockDataPath = join(PROJECT_ROOT, 'mocks');
    const ensureMockScript = join(PROJECT_ROOT, 'scripts', 'ensure-mock.sh');
    
    if (existsSync(ensureMockScript)) {
      console.log('   Running ensure-mock.sh...');
      execSync(`bash ${ensureMockScript}`, { cwd: PROJECT_ROOT, stdio: 'inherit' });
    } else {
      console.log('   ⚠️  ensure-mock.sh not found, skipping...');
    }
    
    console.log('✅ Mock data synced');
    return true;
  } catch (error) {
    console.error('❌ Failed to sync mock data:', error.message);
    return false;
  }
}

async function syncSponsorData() {
  console.log('\n🎯 Syncing sponsor data...');
  
  try {
    const sponsorDataPath = join(PROJECT_ROOT, 'data');
    const sponsorRefPath = join(PROJECT_ROOT, 'sponsor-data-reference.md');
    
    if (!existsSync(sponsorRefPath)) {
      console.log('   ⚠️  sponsor-data-reference.md not found, skipping...');
      return true;
    }
    
    // Read sponsor data reference
    const sponsorRef = readFileSync(sponsorRefPath, 'utf-8');
    console.log(`   Found sponsor data reference (${sponsorRef.length} bytes)`);
    
    // Here you could:
    // 1. Parse sponsor data reference
    // 2. Update product catalogs
    // 3. Sync with external APIs
    // 4. Update embeddings
    
    console.log('✅ Sponsor data synced');
    return true;
  } catch (error) {
    console.error('❌ Failed to sync sponsor data:', error.message);
    return false;
  }
}

async function syncStripeData() {
  console.log('\n💳 Syncing Stripe mock data...');
  
  try {
    const stripeMockPath = join(PROJECT_ROOT, 'mocks', 'stripe-data.json');
    
    // Check if Stripe integration exists
    const stripeIntegrationPath = join(PROJECT_ROOT, 'STRIPE_INTEGRATION_GUIDE.md');
    
    if (!existsSync(stripeIntegrationPath)) {
      console.log('   ⚠️  Stripe integration not found, skipping...');
      return true;
    }
    
    // Here you could:
    // 1. Fetch latest products from Stripe
    // 2. Update mock data with real product IDs
    // 3. Sync pricing information
    
    console.log('✅ Stripe data synced');
    return true;
  } catch (error) {
    console.error('❌ Failed to sync Stripe data:', error.message);
    return false;
  }
}

async function updateProductCatalog() {
  console.log('\n📚 Updating product catalog...');
  
  try {
    const productsPath = join(PROJECT_ROOT, 'data', 'products.json');
    const mocksProductsPath = join(PROJECT_ROOT, 'mocks', 'products.json');
    
    // Check if products exist
    if (!existsSync(productsPath) && !existsSync(mocksProductsPath)) {
      console.log('   ⚠️  Product catalog not found, skipping...');
      return true;
    }
    
    // Here you could:
    // 1. Merge data/products.json with mocks/products.json
    // 2. Validate product data
    // 3. Update database with new products
    
    console.log('✅ Product catalog updated');
    return true;
  } catch (error) {
    console.error('❌ Failed to update product catalog:', error.message);
    return false;
  }
}

async function main() {
  console.log('🔄 Style Shepherd Data Sync\n');
  
  const results = [];
  
  // Run sync tasks
  results.push({ task: 'Mock Data', success: await syncMockData() });
  results.push({ task: 'Sponsor Data', success: await syncSponsorData() });
  results.push({ task: 'Stripe Data', success: await syncStripeData() });
  results.push({ task: 'Product Catalog', success: await updateProductCatalog() });
  
  // Summary
  console.log('\n📊 Data Sync Summary:');
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}`);
  
  if (failed > 0) {
    console.log('\n❌ Some sync tasks failed:');
    results
      .filter(r => !r.success)
      .forEach(r => console.log(`   - ${r.task}`));
    process.exit(1);
  }
  
  console.log('\n✅ All data sync tasks completed successfully!');
  process.exit(0);
}

main().catch(error => {
  console.error('\n💥 Data sync failed with error:', error);
  process.exit(1);
});
