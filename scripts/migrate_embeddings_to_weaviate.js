// scripts/migrate_embeddings_to_weaviate.js
// Migrate product embeddings from PostgreSQL to Weaviate vector database
// Usage: node scripts/migrate_embeddings_to_weaviate.js

require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

// Note: You'll need to install weaviate-client
// npm install weaviate-client
let weaviate;
try {
  weaviate = require('weaviate-client');
} catch (e) {
  console.error('Please install weaviate-client: npm install weaviate-client');
  process.exit(1);
}

async function run() {
  const url = process.env.WEAVIATE_URL;
  const apiKey = process.env.WEAVIATE_API_KEY;

  if (!url) {
    throw new Error('WEAVIATE_URL required in .env.local');
  }

  const pool = new Pool({
    host: process.env.VULTR_POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.VULTR_POSTGRES_PORT || '5432'),
    database: process.env.VULTR_POSTGRES_DATABASE,
    user: process.env.VULTR_POSTGRES_USER,
    password: process.env.VULTR_POSTGRES_PASSWORD,
    ssl: process.env.VULTR_POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });

  try {
    // Initialize Weaviate client
    const client = weaviate.client({
      scheme: url.startsWith('https') ? 'https' : 'http',
      host: url.replace(/^https?:\/\//, ''),
      headers: apiKey ? { 'X-API-Key': apiKey } : {},
    });

    // Ensure schema exists
    const className = 'Product';
    const schemaExists = await client.schema.exists(className);

    if (!schemaExists) {
      console.log(`Creating schema for class: ${className}`);
      try {
        await client.schema
          .classCreator()
          .withClass({
            class: className,
            description: 'Product vectors',
            vectorizer: 'none', // We provide our own vectors
            properties: [
              { name: 'sku', dataType: ['string'] },
              { name: 'title', dataType: ['text'] },
              { name: 'brand', dataType: ['string'] },
              { name: 'category', dataType: ['string'] },
              { name: 'price', dataType: ['number'] },
            ],
          })
          .do();
        console.log(`✅ Created class: ${className}`);
      } catch (e) {
        if (!e.message.includes('already exists')) {
          throw e;
        }
        console.log(`Class ${className} already exists`);
      }
    }

    // Fetch products with embeddings
    const result = await pool.query(`
      SELECT id, name, description, price, brand, category, embedding
      FROM catalog
      WHERE embedding IS NOT NULL AND embedding != 'null'::jsonb
    `);

    const products = result.rows;
    console.log(`Found ${products.length} products with embeddings`);

    if (products.length === 0) {
      console.log('No products with embeddings found. Run compute_product_embeddings.js first.');
      await pool.end();
      process.exit(0);
    }

    const batchSize = 50;
    let processed = 0;

    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);
      const builder = client.batch.objectsBatcher();

      for (const p of batch) {
        let embedding;
        if (typeof p.embedding === 'string') {
          embedding = JSON.parse(p.embedding);
        } else if (Array.isArray(p.embedding)) {
          embedding = p.embedding;
        } else {
          continue;
        }

        builder.withObject({
          class: className,
          id: p.id,
          properties: {
            sku: p.id,
            title: p.name || '',
            brand: p.brand || '',
            category: p.category || '',
            price: parseFloat(p.price) || 0,
          },
          vector: embedding,
        });
      }

      try {
        await builder.do();
        processed += batch.length;
        console.log(`Upserted ${processed}/${products.length}`);
      } catch (error) {
        console.error(`Error upserting batch ${i}-${i + batch.length}:`, error.message);
      }
    }

    console.log(`✅ Migration complete! Upserted ${processed} products`);
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
    process.exit(1);
  }
}

run();
