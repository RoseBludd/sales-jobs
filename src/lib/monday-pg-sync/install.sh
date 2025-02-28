#!/bin/bash

# Monday.com to PostgreSQL Sync Installation Script

echo "🚀 Installing Monday.com to PostgreSQL Sync dependencies..."

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install Node.js and npm first."
    exit 1
fi

# Install dependencies
echo "📦 Installing npm dependencies..."
npm install pg monday-sdk-js node-fetch
npm install --save-dev @types/node @types/pg ts-node typescript

echo "✅ Dependencies installed successfully!"

# Check if PostgreSQL is accessible
echo "🔍 Checking PostgreSQL connection..."
npx ts-node -e "
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ PostgreSQL connection failed:', err.message);
    process.exit(1);
  } else {
    console.log('✅ PostgreSQL connection successful!');
    pool.end();
  }
});" || echo "❌ PostgreSQL connection check failed. Please make sure your DATABASE_URL environment variable is set correctly."

# Check Monday.com API key
echo "🔍 Checking Monday.com API key..."
npx ts-node -e "
const fetch = require('node-fetch');
const MONDAY_API_KEY = process.env.MONDAY_API_KEY;
if (!MONDAY_API_KEY) {
  console.error('❌ MONDAY_API_KEY environment variable is not set.');
  process.exit(1);
}
fetch('https://api.monday.com/v2', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': MONDAY_API_KEY
  },
  body: JSON.stringify({ query: '{boards(limit:1){id}}' })
})
.then(res => res.json())
.then(res => {
  if (res.errors) {
    console.error('❌ Monday.com API key validation failed:', res.errors[0].message);
    process.exit(1);
  } else {
    console.log('✅ Monday.com API key is valid!');
  }
})
.catch(err => {
  console.error('❌ Monday.com API request failed:', err.message);
  process.exit(1);
});" || echo "❌ Monday.com API key check failed. Please make sure your MONDAY_API_KEY environment variable is set correctly."

echo "
🎉 Installation completed!

Next steps:
1. Make sure your environment variables are set:
   - DATABASE_URL: PostgreSQL connection string
   - MONDAY_API_KEY: Monday.com API key
   - MONDAY_BOARD_ID_USERS: Sales Staff Board ID (default: 5764059860)
   - MONDAY_BOARD_ID_DATA: Master Project Board ID (default: 6727219152)
   - MONDAY_WEBHOOK_SECRET: Secret for webhook verification

2. Initialize the database schema:
   npx ts-node scripts/sync-monday-to-pg.ts

3. Run the test suite:
   npx ts-node tests/test-sync.ts

4. Set up the webhook in Monday.com to point to your API endpoint:
   URL: https://your-domain.com/api/monday-webhook
   Events: Item Create, Item Update, Column Value Create, Column Value Update, Item Delete

For more information, see the README.md file.
"
