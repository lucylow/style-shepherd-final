// scripts/migrate_embeddings_to_pinecone.js
// Migrate product embeddings from PostgreSQL to Pinecone vector database
// Usage: node scripts/migrate_embeddings_to_pinecone.js

require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

// Note: You'll need to install @pinecone-database/pinecone
// npm install @pinecone-database/pinecone
let PineconeClient;
try {
  const pinecone = require('@pinecone-database/pinecone');
  PineconeClient = pinecone.PineconeClient || pinecone.default?.PineconeClient || pinecone;
} catch (e) {
  console.error('Please install @pinecone-database/pinecone: npm install @pinecone-database/pinecone');
  process.exit(1);
}

async function run() {
  const apiKey = process.env.PINECONE_API_KEY;
  const environment = process.env.PINECONE_ENVIRONMENT;
  const indexName = process.env.PINECONE_INDEX_NAME || 'style-shepherd-products';

  if (!apiKey || !environment) {
    throw new Error('PINECONE_API_KEY and PINECONE_ENVIRONMENT required in .env.local');
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
    // Initialize Pinecone client
    const client = new PineconeClient();
    await client.init({ apiKey, environment });

    const index = client.Index(indexName);

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

    // Parse embeddings and prepare vectors
    const vectors = products
      .map((p) => {
        let embedding;
        if (typeof p.embedding === 'string') {
          embedding = JSON.parse(p.embedding);
        } else if (Array.isArray(p.embedding)) {
          embedding = p.embedding;
        } else {
          return null;
        }

        return {
          id: String(p.id),
          values: embedding,
          metadata: {
            sku: p.id,
            title: p.name || '',
            price: parseFloat(p.price) || 0,
            brand: p.brand || '',
            category: p.category || '',
          },
        };
      })
      .filter(Boolean);

    console.log(`Upserting ${vectors.length} vectors to Pinecone index ${indexName}...`);

    const batchSize = 100;
    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize);
      
      try {
        await index.upsert({ upsertRequest: { vectors: batch } });
        console.log(`Upserted ${Math.min(i + batch.length, vectors.length)}/${vectors.length}`);
      } catch (error) {
        console.error(`Error upserting batch ${i}-${i + batch.length}:`, error.message);
      }
    }

    console.log('✅ Migration complete!');
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
    process.exit(1);
  }
}

run();
