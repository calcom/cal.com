const { execSync } = require('child_process');

console.log('🧪 Testing benchmark script...');

try {
  console.log('Running quick benchmark test...');
  execSync('node benchmark-date-libraries.js', { stdio: 'inherit', timeout: 60000 });
  console.log('✅ Benchmark test completed successfully');
} catch (error) {
  console.error('❌ Benchmark test failed:', error.message);
  process.exit(1);
}
