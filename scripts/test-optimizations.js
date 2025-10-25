#!/usr/bin/env node

/**
 * Quick test script to verify optimization components
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Cal.com Dev Server Optimizations\n');

// Test 1: Check if optimization files exist
console.log('📁 Checking optimization files...');
const files = [
  'utils/AssetSymlinkManager.js',
  'utils/RouteManifest.js',
  'utils/RouteLazyLoader.js',
  'utils/AppRegistryOptimizer.js',
  'hooks/useOptimizedAppStore.js'
];

let allFilesExist = true;
files.forEach(file => {
  const exists = fs.existsSync(path.join(__dirname, '..', file));
  console.log(`  ${exists ? '✅' : '❌'} ${file}`);
  if (!exists) allFilesExist = false;
});

if (!allFilesExist) {
  console.error('\n❌ Some optimization files are missing!');
  process.exit(1);
}

// Test 2: Quick functionality test
console.log('\n🔧 Testing basic functionality...');

try {
  // Test AssetSymlinkManager
  const AssetSymlinkManager = require('../utils/AssetSymlinkManager');
  console.log('  ✅ AssetSymlinkManager loads correctly');

  // Test RouteManifest
  const RouteManifest = require('../utils/RouteManifest');
  const manifest = new RouteManifest();
  console.log('  ✅ RouteManifest instantiates correctly');

  // Test RouteLazyLoader
  const RouteLazyLoader = require('../utils/RouteLazyLoader');
  const loader = new RouteLazyLoader();
  console.log('  ✅ RouteLazyLoader instantiates correctly');

  // Test AppRegistryOptimizer
  const AppRegistryOptimizer = require('../utils/AppRegistryOptimizer');
  const optimizer = new AppRegistryOptimizer();
  console.log('  ✅ AppRegistryOptimizer instantiates correctly');

} catch (error) {
  console.error('\n❌ Error testing components:', error.message);
  process.exit(1);
}

// Test 3: Environment variable handling
console.log('\n🌍 Testing environment variables...');
const envVars = ['USE_ROUTE_MANIFEST', 'USE_APP_CACHE', 'USE_ASSET_SYMLINKS'];
envVars.forEach(env => {
  console.log(`  ℹ️  ${env}: ${process.env[env] || 'not set (defaults to false)'}`);
});

console.log('\n✅ All basic tests passed!');
console.log('\nRun ./scripts/benchmark.sh for full performance testing');