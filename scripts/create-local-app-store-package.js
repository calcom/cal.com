#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🏗️  Building app-store package for local testing...');

const appStorePath = path.join(__dirname, '..', 'packages', 'app-store');
process.chdir(appStorePath);

try {
  console.log('📦 Generating app-store files...');
  execSync('yarn app-store:build', { stdio: 'inherit' });
  
  console.log('🔧 Preparing package.json for local testing...');
  execSync('node scripts/local.js', { stdio: 'inherit' });
  
  console.log('📦 Creating npm package...');
  execSync('npm pack', { stdio: 'inherit' });
  
  const files = fs.readdirSync('.');
  const tgzFile = files.find(file => file.endsWith('.tgz'));
  
  if (tgzFile) {
    console.log(`✅ Local npm package created: ${tgzFile}`);
    console.log(`📍 Location: ${path.join(appStorePath, tgzFile)}`);
    console.log('\n🚀 To use this package in apps/web:');
    console.log(`   cd apps/web`);
    console.log(`   yarn add file:../../packages/app-store/${tgzFile}`);
  }
  
} catch (error) {
  console.error('❌ Error creating local package:', error.message);
  process.exit(1);
}
