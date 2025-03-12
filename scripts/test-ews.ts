const { runTests } = require('../src/lib/test-ews');

// Run the tests
runTests().catch((error: any) => {
  console.error('Test execution failed:', error);
  process.exit(1);
}); 