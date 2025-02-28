@echo off
echo 🚀 Installing Monday.com to PostgreSQL Sync dependencies...

REM Check if npm is installed
where npm >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ❌ npm is not installed. Please install Node.js and npm first.
    exit /b 1
)

REM Install dependencies
echo 📦 Installing npm dependencies...
call npm install pg monday-sdk-js node-fetch
call npm install --save-dev @types/node @types/pg ts-node typescript

echo ✅ Dependencies installed successfully!

REM Check if PostgreSQL is accessible
echo 🔍 Checking PostgreSQL connection...
call npx ts-node -e "const { Pool } = require('pg'); const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false }); pool.query('SELECT NOW()', (err, res) => { if (err) { console.error('❌ PostgreSQL connection failed:', err.message); process.exit(1); } else { console.log('✅ PostgreSQL connection successful!'); pool.end(); } });" || echo ❌ PostgreSQL connection check failed. Please make sure your DATABASE_URL environment variable is set correctly.

REM Check Monday.com API key
echo 🔍 Checking Monday.com API key...
call npx ts-node -e "const fetch = require('node-fetch'); const MONDAY_API_KEY = process.env.MONDAY_API_KEY; if (!MONDAY_API_KEY) { console.error('❌ MONDAY_API_KEY environment variable is not set.'); process.exit(1); } fetch('https://api.monday.com/v2', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': MONDAY_API_KEY }, body: JSON.stringify({ query: '{boards(limit:1){id}}' }) }).then(res => res.json()).then(res => { if (res.errors) { console.error('❌ Monday.com API key validation failed:', res.errors[0].message); process.exit(1); } else { console.log('✅ Monday.com API key is valid!'); } }).catch(err => { console.error('❌ Monday.com API request failed:', err.message); process.exit(1); });" || echo ❌ Monday.com API key check failed. Please make sure your MONDAY_API_KEY environment variable is set correctly.

echo.
echo 🎉 Installation completed!
echo.
echo Next steps:
echo 1. Make sure your environment variables are set:
echo    - DATABASE_URL: PostgreSQL connection string
echo    - MONDAY_API_KEY: Monday.com API key
echo    - MONDAY_BOARD_ID_USERS: Sales Staff Board ID (default: 5764059860)
echo    - MONDAY_BOARD_ID_DATA: Master Project Board ID (default: 6727219152)
echo    - MONDAY_WEBHOOK_SECRET: Secret for webhook verification
echo.
echo 2. Initialize the database schema:
echo    npx ts-node scripts/sync-monday-to-pg.ts
echo.
echo 3. Run the test suite:
echo    npx ts-node tests/test-sync.ts
echo.
echo 4. Set up the webhook in Monday.com to point to your API endpoint:
echo    URL: https://your-domain.com/api/monday-webhook
echo    Events: Item Create, Item Update, Column Value Create, Column Value Update, Item Delete
echo.
echo For more information, see the README.md file.
