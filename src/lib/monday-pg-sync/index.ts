#!/usr/bin/env node

import { syncMondayToPostgres } from './scripts/sync-monday-to-pg';
import { syncPostgresToMonday } from './scripts/sync-pg-to-monday';
import runTests from './tests/test-sync';

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0] || 'help';

async function main() {
  console.log('🚀 Monday.com to PostgreSQL Sync CLI');
  
  switch (command) {
    case 'monday-to-pg':
      console.log('Running Monday.com to PostgreSQL sync...');
      const mondayToPgResult = await syncMondayToPostgres();
      console.log('Sync result:', mondayToPgResult);
      break;
      
    case 'pg-to-monday':
      console.log('Running PostgreSQL to Monday.com sync...');
      const pgToMondayResult = await syncPostgresToMonday();
      console.log('Sync result:', pgToMondayResult);
      break;
      
    case 'bidirectional':
      console.log('Running bidirectional sync...');
      console.log('Step 1: Monday.com to PostgreSQL');
      const mondayToPgResult2 = await syncMondayToPostgres();
      console.log('Step 1 result:', mondayToPgResult2);
      
      console.log('Step 2: PostgreSQL to Monday.com');
      const pgToMondayResult2 = await syncPostgresToMonday();
      console.log('Step 2 result:', pgToMondayResult2);
      
      console.log('Bidirectional sync completed.');
      break;
      
    case 'test':
      console.log('Running tests...');
      await runTests();
      break;
      
    case 'help':
    default:
      console.log(`
Usage: npx ts-node index.ts [command]

Commands:
  monday-to-pg    Sync data from Monday.com to PostgreSQL
  pg-to-monday    Sync data from PostgreSQL to Monday.com
  bidirectional   Run both syncs in sequence
  test            Run the test suite
  help            Show this help message
      `);
      break;
  }
}

main()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
