// scripts/export_training_data.js
// Export labeled training data from interactions for learn-to-rank model
// Usage: node scripts/export_training_data.js

require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const { embedOpenAI, cosineSim } = require('../lib/embeddings.js');

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
    // Fetch recommendation impressions from interactions table
    // Note: Adjust the query based on your actual schema
    const impressionsResult = await pool.query(`
      SELECT 
        i.id,
        i.user_id as "userId",
        i.product_id as "productId",
        i.created_at as "createdAt",
        i.metadata->>'query' as query,
        i.metadata->>'searchQuery' as searchQuery
      FROM interactions i
      WHERE i.type = 'recommendation_impression' OR i.type = 'view'
      ORDER BY i.created_at ASC
      LIMIT 100000
    `);

    const impressions = impressionsResult.rows;
    console.log(`Found ${impressions.length} impressions to process`);

    if (impressions.length === 0) {
      console.log('No impressions found. Make sure interactions are being logged.');
      await pool.end();
      process.exit(0);
    }

    const out = path.join(process.cwd(), 'training_data.csv');
    const header = [
      'userId',
      'productId',
      'sim',
      'sizeMatch',
      'returnRisk',
      'popularity',
      'recencyDays',
      'priceNorm',
      'label',
    ];
    fs.writeFileSync(out, header.join(',') + '\n');

    let processed = 0;
    let errors = 0;

    for (const imp of impressions) {
      try {
        // Fetch product details
        const productResult = await pool.query(
          `SELECT 
            id, name, embedding, price, sizes, return_risk, popularity, created_at
          FROM catalog 
          WHERE id = $1`,
          [imp.productId]
        );

        if (productResult.rows.length === 0) {
          continue; // Product not found, skip
        }

        const product = productResult.rows[0];

        // Fetch user details
        const userResult = await pool.query(
          `SELECT user_id, preferences, body_measurements 
          FROM user_profiles 
          WHERE user_id = $1`,
          [imp.userId]
        );

        const user = userResult.rows[0] || null;

        // Compute label: whether user purchased this product within next 7 days
        const purchaseResult = await pool.query(
          `SELECT id 
          FROM interactions 
          WHERE user_id = $1 
            AND product_id = $2 
            AND type IN ('purchase', 'add_to_cart')
            AND created_at >= $3 
            AND created_at < $4
          LIMIT 1`,
          [
            imp.userId,
            imp.productId,
            imp.createdAt,
            new Date(new Date(imp.createdAt).getTime() + 7 * 24 * 3600 * 1000),
          ]
        );

        const label = purchaseResult.rows.length > 0 ? 1 : 0;

        // Compute similarity: if impression has query text
        let sim = 0.0;
        const queryText = imp.query || imp.searchQuery;
        if (queryText && product.embedding) {
          try {
            let productEmbedding;
            if (typeof product.embedding === 'string') {
              productEmbedding = JSON.parse(product.embedding);
            } else if (Array.isArray(product.embedding)) {
              productEmbedding = product.embedding;
            } else {
              productEmbedding = null;
            }

            if (productEmbedding && Array.isArray(productEmbedding)) {
              const [queryEmb] = await embedOpenAI([queryText]);
              sim = cosineSim(queryEmb, productEmbedding);
            }
          } catch (e) {
            console.warn(`Embedding error for impression ${imp.id}:`, e.message);
          }
        }

        // Size match: check if user size matches product sizes
        let sizeMatch = 0;
        if (user && user.body_measurements) {
          const measurements = typeof user.body_measurements === 'string'
            ? JSON.parse(user.body_measurements)
            : user.body_measurements;
          const userSize = measurements.size || measurements.preferredSize;
          
          if (userSize && product.sizes) {
            const sizes = typeof product.sizes === 'string'
              ? JSON.parse(product.sizes)
              : product.sizes;
            sizeMatch = Array.isArray(sizes) && sizes.includes(userSize) ? 1 : 0;
          }
        }

        // Other features
        const returnRisk = parseFloat(product.return_risk) || 0.25;
        const popularity = parseFloat(product.popularity) || 0.5;
        const recencyDays =
          (Date.now() - new Date(product.created_at).getTime()) / (1000 * 3600 * 24);
        const priceNorm = (parseFloat(product.price) || 0) / 10000; // Normalize roughly

        const row = [
          imp.userId,
          imp.productId,
          sim.toFixed(6),
          sizeMatch,
          returnRisk.toFixed(4),
          popularity.toFixed(4),
          recencyDays.toFixed(2),
          priceNorm.toFixed(4),
          label,
        ];

        fs.appendFileSync(out, row.join(',') + '\n');
        processed++;

        if (processed % 200 === 0) {
          console.log(`Exported ${processed}/${impressions.length} (errors: ${errors})`);
        }
      } catch (error) {
        errors++;
        if (errors % 10 === 0) {
          console.warn(`Encountered ${errors} errors so far...`);
        }
      }
    }

    console.log(`✅ Export complete!`);
    console.log(`   Processed: ${processed}`);
    console.log(`   Errors: ${errors}`);
    console.log(`   Output: ${out}`);
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
    process.exit(1);
  }
}

run();

