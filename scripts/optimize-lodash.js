#!/usr/bin/env node

/**
 * Lodash Optimization Script for Cal.com
 * This script identifies and optimizes lodash imports for better tree-shaking
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Common lodash functions used in Cal.com
const LODASH_FUNCTIONS = [
  'debounce', 'throttle', 'isEmpty', 'isEqual', 'merge', 'cloneDeep',
  'pick', 'omit', 'get', 'set', 'has', 'uniq', 'flatten', 'groupBy',
  'sortBy', 'find', 'filter', 'map', 'reduce', 'forEach', 'includes',
  'startsWith', 'endsWith', 'kebabCase', 'camelCase', 'snakeCase'
];

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function findLodashImports(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const imports = [];

    lines.forEach((line, index) => {
      // Check for various lodash import patterns
      const patterns = [
        /import\s+_\s+from\s+['"]lodash['"]/, // import _ from 'lodash'
        /import\s+\*\s+as\s+_\s+from\s+['"]lodash['"]/, // import * as _ from 'lodash'
        /import\s+{\s*([^}]+)\s*}\s+from\s+['"]lodash['"]/, // import { func } from 'lodash'
        /const\s+_\s+=\s+require\(['"]lodash['"]\)/, // const _ = require('lodash')
        /const\s+{\s*([^}]+)\s*}\s+=\s+require\(['"]lodash['"]\)/, // const { func } = require('lodash')
      ];

      patterns.forEach((pattern, patternIndex) => {
        const match = line.match(pattern);
        if (match) {
          imports.push({
            lineNumber: index + 1,
            originalLine: line.trim(),
            type: patternIndex < 3 ? 'import' : 'require',
            functions: match[1] ? match[1].split(',').map(f => f.trim()) : ['_'],
          });
        }
      });
    });

    return imports;
  } catch (error) {
    log(`Error reading file ${filePath}: ${error.message}`, 'red');
    return [];
  }
}

function findLodashUsage(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const usages = [];

    // Find lodash function calls
    LODASH_FUNCTIONS.forEach(func => {
      const patterns = [
        new RegExp(`_\\.${func}\\(`, 'g'), // _.function(
        new RegExp(`\\b${func}\\(`, 'g'), // function( (for destructured imports)
      ];

      patterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          const lines = content.substring(0, match.index).split('\n');
          usages.push({
            function: func,
            line: lines.length,
            usage: match[0],
          });
        }
      });
    });

    return usages;
  } catch (error) {
    log(`Error analyzing file ${filePath}: ${error.message}`, 'red');
    return [];
  }
}

function generateOptimizedImport(usages) {
  const uniqueFunctions = [...new Set(usages.map(u => u.function))];
  
  if (uniqueFunctions.length === 0) {
    return null;
  }

  if (uniqueFunctions.length === 1) {
    return `import ${uniqueFunctions[0]} from 'lodash/${uniqueFunctions[0]}';`;
  }

  return uniqueFunctions
    .map(func => `import ${func} from 'lodash/${func}';`)
    .join('\n');
}

function analyzeFile(filePath) {
  const imports = findLodashImports(filePath);
  const usages = findLodashUsage(filePath);

  if (imports.length === 0 && usages.length === 0) {
    return null;
  }

  const optimizedImport = generateOptimizedImport(usages);
  
  return {
    filePath,
    imports,
    usages,
    optimizedImport,
    potentialSavings: imports.some(i => i.functions.includes('_')) ? 'HIGH' : 'MEDIUM',
  };
}

function scanProject() {
  log('🔍 Scanning project for lodash usage...', 'blue');

  const patterns = [
    'apps/**/*.{js,jsx,ts,tsx}',
    'packages/**/*.{js,jsx,ts,tsx}',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/build/**',
    '!**/.next/**',
  ];

  const files = [];
  patterns.forEach(pattern => {
    if (pattern.startsWith('!')) {
      return; // Skip exclude patterns for now
    }
    const matchedFiles = glob.sync(pattern, { ignore: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.next/**'] });
    files.push(...matchedFiles);
  });

  log(`📁 Found ${files.length} files to analyze`, 'cyan');

  const results = [];
  let processedFiles = 0;

  files.forEach(file => {
    const result = analyzeFile(file);
    if (result) {
      results.push(result);
    }
    processedFiles++;

    if (processedFiles % 50 === 0) {
      log(`   Processed ${processedFiles}/${files.length} files...`, 'yellow');
    }
  });

  return results;
}

function generateReport(results) {
  log('\n📊 Lodash Usage Analysis Report', 'magenta');
  log('================================', 'magenta');

  const highPriorityFiles = results.filter(r => r.potentialSavings === 'HIGH');
  const mediumPriorityFiles = results.filter(r => r.potentialSavings === 'MEDIUM');

  log(`\n🚨 High Priority Files (${highPriorityFiles.length}):`, 'red');
  highPriorityFiles.forEach(file => {
    log(`   ${file.filePath}`, 'yellow');
    file.imports.forEach(imp => {
      log(`     Line ${imp.lineNumber}: ${imp.originalLine}`, 'reset');
    });
    if (file.optimizedImport) {
      log(`     Suggested: ${file.optimizedImport}`, 'green');
    }
  });

  log(`\n⚠️  Medium Priority Files (${mediumPriorityFiles.length}):`, 'yellow');
  mediumPriorityFiles.slice(0, 10).forEach(file => {
    log(`   ${file.filePath}`, 'reset');
    if (file.optimizedImport) {
      log(`     Suggested: ${file.optimizedImport}`, 'green');
    }
  });

  if (mediumPriorityFiles.length > 10) {
    log(`   ... and ${mediumPriorityFiles.length - 10} more files`, 'cyan');
  }

  // Generate optimization commands
  log('\n🛠️  Optimization Commands:', 'blue');
  log('To apply optimizations, run the following commands:', 'reset');
  
  highPriorityFiles.slice(0, 5).forEach(file => {
    log(`\n# Optimize ${file.filePath}`, 'cyan');
    log(`# Replace full lodash import with specific imports`, 'reset');
    if (file.optimizedImport) {
      log(`# Use: ${file.optimizedImport}`, 'green');
    }
  });

  // Calculate potential savings
  const totalFiles = results.length;
  const estimatedSavings = highPriorityFiles.length * 70 + mediumPriorityFiles.length * 20; // KB
  
  log(`\n📈 Potential Impact:`, 'magenta');
  log(`   Files to optimize: ${totalFiles}`, 'reset');
  log(`   Estimated bundle size reduction: ~${estimatedSavings}KB`, 'green');
  log(`   High priority optimizations: ${highPriorityFiles.length}`, 'red');
  log(`   Medium priority optimizations: ${mediumPriorityFiles.length}`, 'yellow');
}

function main() {
  log('🚀 Cal.com Lodash Optimization Tool', 'magenta');
  log('===================================', 'magenta');

  const results = scanProject();
  
  if (results.length === 0) {
    log('✅ No lodash usage found or already optimized!', 'green');
    return;
  }

  generateReport(results);

  // Save detailed report
  const reportPath = 'lodash-optimization-report.json';
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  log(`\n💾 Detailed report saved to: ${reportPath}`, 'blue');
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { scanProject, analyzeFile, generateReport };