// scripts/compute_product_embeddings.js
// Compute and persist product embeddings for products that don't have them yet
// Usage: node scripts/compute_product_embeddings.js

require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const { embedOpenAI } = require('../lib/embeddings.js');

async function run() {
  const pool = new Pool({
    host: process.env.VULTR_POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.VULTR_POSTGRES_PORT || '5432'),
    database: process.env.VULTR_POSTGRES_DATABASE,
    user: process.env.VULTR_POSTGRES_USER,
    password: process.env.VULTR_POSTGRES_PASSWORD,
    ssl: process.env.VULTR_POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });

  try {
    // Fetch products without embeddings or with null embeddings
    const result = await pool.query(`
      SELECT id, name, description, brand, category
      FROM catalog
      WHERE embedding IS NULL OR embedding = 'null'::jsonb
      ORDER BY created_at DESC
      LIMIT 10000
    `);

    const products = result.rows;
    console.log(`Found ${products.length} products without embeddings`);

    if (products.length === 0) {
      console.log('All products already have embeddings!');
      await pool.end();
      process.exit(0);
    }

    const batchSize = 10; // Process in small batches to avoid rate limits
    let processed = 0;

    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);

      for (const product of batch) {
        try {
          // Build text representation for embedding
          const textParts = [product.name];
          if (product.description) {
            textParts.push(product.description);
          }
          if (product.brand) {
            textParts.push(`Brand: ${product.brand}`);
          }
          if (product.category) {
            textParts.push(`Category: ${product.category}`);
          }

          const text = textParts.join('. ');
          const [embedding] = await embedOpenAI([text]);

          // Persist embedding
          await pool.query(
            `UPDATE catalog SET embedding = $1 WHERE id = $2`,
            [JSON.stringify(embedding), product.id]
          );

          processed++;
          if (processed % 10 === 0) {
            console.log(`Processed ${processed}/${products.length} products...`);
          }

          // Small delay to avoid rate limits
          await new Promise((resolve) => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`Error processing product ${product.id}:`, error.message);
        }
      }
    }

    console.log(`✅ Successfully computed embeddings for ${processed} products`);
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
    process.exit(1);
  }
}

run();
