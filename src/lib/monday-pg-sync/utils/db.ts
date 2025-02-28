import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables based on NODE_ENV
if (process.env.NODE_ENV === 'test') {
  // Load test environment variables
  const envTestPath = path.resolve(process.cwd(), '.env.test');
  if (fs.existsSync(envTestPath)) {
    console.log('🧪 Using test environment variables from .env.test');
    dotenv.config({ path: envTestPath });
  } else {
    console.warn('⚠️ .env.test file not found, falling back to .env');
    dotenv.config();
  }
} else {
  // Load regular environment variables
  dotenv.config();
}

// Get the appropriate DATABASE_URL
const DATABASE_URL = process.env.DATABASE_URL;

// Log which database we're connecting to (without exposing credentials)
const logDbConnection = () => {
  if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL is not set');
    return;
  }
  
  try {
    // Extract just the database name from the URL for logging
    const dbNameMatch = DATABASE_URL.match(/\/([^/]+)$/);
    const dbName = dbNameMatch ? dbNameMatch[1] : 'unknown';
    console.log(`🔌 Connecting to database: ${dbName}`);
  } catch (error) {
    console.error('❌ Error parsing DATABASE_URL:', error);
  }
};

logDbConnection();

// Create a PostgreSQL connection pool
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Initialize the database with our schema
export async function initializeDatabase() {
  try {
    console.log('🔄 Initializing database schema...');
    
    // Read the schema SQL file
    const schemaPath = path.join(process.cwd(), 'src/lib/monday-pg-sync/models/schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute the schema SQL
    await pool.query(schemaSql);
    
    console.log('✅ Database schema initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Error initializing database schema:', error);
    return false;
  }
}

// Execute a query with parameters
export async function query(text: string, params?: any[]) {
  try {
    const start = Date.now();
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    
    console.log('Executed query', { text, duration, rows: result.rowCount });
    return result;
  } catch (error) {
    console.error('Error executing query', { text, error });
    throw error;
  }
}

// Get a client from the pool
export async function getClient() {
  const client = await pool.connect();
  const query = client.query;
  const release = client.release;
  
  // Set a timeout of 5 seconds on idle clients
  const timeout = setTimeout(() => {
    console.error('A client has been checked out for too long.');
    console.error(`The last executed query on this client was: ${client.lastQuery}`);
  }, 5000);
  
  // Monkey patch the query method to keep track of the last query executed
  client.query = (...args: any[]) => {
    client.lastQuery = args;
    return query.apply(client, args);
  };
  
  client.release = () => {
    clearTimeout(timeout);
    client.query = query;
    client.release = release;
    return release.apply(client);
  };
  
  return client;
}

export default {
  query,
  getClient,
  initializeDatabase,
  pool
};
