import { syncMondayToPostgres } from '../scripts/sync-monday-to-pg';
import { syncPostgresToMonday } from '../scripts/sync-pg-to-monday';
import db from '../utils/db';

// Helper function to log test results
function logTestResult(testName: string, success: boolean, message?: string) {
  console.log(`${success ? '✅' : '❌'} ${testName}${message ? `: ${message}` : ''}`);
}

// Test database connection
async function testDatabaseConnection() {
  try {
    const result = await db.query('SELECT NOW() as now');
    logTestResult('Database Connection', true, `Connected to PostgreSQL at ${result.rows[0].now}`);
    return true;
  } catch (error) {
    logTestResult('Database Connection', false, (error as Error).message);
    return false;
  }
}

// Test database schema initialization
async function testDatabaseSchema() {
  try {
    const result = await db.initializeDatabase();
    logTestResult('Database Schema Initialization', result, result ? 'Schema created successfully' : 'Failed to create schema');
    return result;
  } catch (error) {
    logTestResult('Database Schema Initialization', false, (error as Error).message);
    return false;
  }
}

// Test Monday.com to PostgreSQL sync
async function testMondayToPostgresSync() {
  try {
    const result = await syncMondayToPostgres();
    logTestResult('Monday.com to PostgreSQL Sync', result.success, result.success ? 'Sync completed successfully' : result.message);
    return result.success;
  } catch (error) {
    logTestResult('Monday.com to PostgreSQL Sync', false, (error as Error).message);
    return false;
  }
}

// Test PostgreSQL to Monday.com sync
async function testPostgresToMondaySync() {
  try {
    const result = await syncPostgresToMonday();
    logTestResult('PostgreSQL to Monday.com Sync', result.success, result.success ? 'Sync completed successfully' : result.message);
    return result.success;
  } catch (error) {
    logTestResult('PostgreSQL to Monday.com Sync', false, (error as Error).message);
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('🧪 Running Monday.com to PostgreSQL Sync Tests...');
  
  // Test database connection
  const dbConnectionSuccess = await testDatabaseConnection();
  
  if (!dbConnectionSuccess) {
    console.error('❌ Database connection failed. Aborting tests.');
    return;
  }
  
  // Test database schema initialization
  const dbSchemaSuccess = await testDatabaseSchema();
  
  if (!dbSchemaSuccess) {
    console.error('❌ Database schema initialization failed. Aborting tests.');
    return;
  }
  
  // Test Monday.com to PostgreSQL sync
  const mondayToPgSuccess = await testMondayToPostgresSync();
  
  // Test PostgreSQL to Monday.com sync
  const pgToMondaySuccess = await testPostgresToMondaySync();
  
  // Summary
  console.log('\n📊 Test Summary:');
  console.log(`Database Connection: ${dbConnectionSuccess ? '✅' : '❌'}`);
  console.log(`Database Schema: ${dbSchemaSuccess ? '✅' : '❌'}`);
  console.log(`Monday.com to PostgreSQL Sync: ${mondayToPgSuccess ? '✅' : '❌'}`);
  console.log(`PostgreSQL to Monday.com Sync: ${pgToMondaySuccess ? '✅' : '❌'}`);
  
  const allTestsPassed = dbConnectionSuccess && dbSchemaSuccess && mondayToPgSuccess && pgToMondaySuccess;
  console.log(`\n${allTestsPassed ? '✅ All tests passed!' : '❌ Some tests failed.'}`);
}

// If this script is run directly
if (require.main === module) {
  runTests()
    .then(() => {
      console.log('Tests completed.');
      process.exit(0);
    })
    .catch(error => {
      console.error('Unhandled error during tests:', error);
      process.exit(1);
    });
}

export default runTests;
