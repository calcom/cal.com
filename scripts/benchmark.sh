#!/bin/bash

# Cal.com Dev Server Optimization Benchmark Script
# This script runs comprehensive performance tests comparing baseline vs optimized performance

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ROOT_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"

echo "🚀 Cal.com Dev Server Performance Benchmark"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Ensure we're in the right directory
cd "$ROOT_DIR"

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Clean up any previous test artifacts
echo "🧹 Cleaning up previous test artifacts..."
rm -rf .next/cache/app-store 2>/dev/null || true
rm -rf .next/route-manifest.json 2>/dev/null || true
rm -rf tests/optimization/performance-report.json 2>/dev/null || true
rm -rf tests/optimization/integration-report.json 2>/dev/null || true

# Kill any existing dev servers
echo "🔪 Killing any existing dev server processes..."
pkill -f "next dev" || true
sleep 2

# Create test directory if it doesn't exist
mkdir -p tests/optimization

# Run integration tests first
echo -e "\n${YELLOW}📋 Running Integration Tests...${NC}"
echo "================================"
node tests/optimization/integration-test.js

# Check if integration tests passed
if [ $? -ne 0 ]; then
    echo -e "\n${RED}❌ Integration tests failed! Aborting benchmark.${NC}"
    exit 1
fi

echo -e "\n${GREEN}✅ Integration tests passed!${NC}"

# Run performance benchmark
echo -e "\n${YELLOW}📊 Running Performance Benchmark...${NC}"
echo "===================================="
node tests/optimization/performance-test.js

# Check benchmark results
if [ -f "tests/optimization/performance-report.json" ]; then
    echo -e "\n${GREEN}✅ Benchmark completed successfully!${NC}"
    
    # Extract key metrics using node
    node -e "
    const report = require('./tests/optimization/performance-report.json');
    const baseline = report.baseline.startupTime.toFixed(2);
    const optimized = report.optimized.startupTime.toFixed(2);
    const improvement = report.improvements.startupTime.percentage;
    const targetMet = report.targetMet;
    
    console.log('\n🎯 Key Metrics:');
    console.log('  Baseline: ' + baseline + 's');
    console.log('  Optimized: ' + optimized + 's');
    console.log('  Improvement: ' + improvement + '%');
    console.log('  Target Met (<7s): ' + (targetMet ? '✅ YES' : '❌ NO'));
    "
else
    echo -e "\n${RED}❌ Benchmark failed to generate report${NC}"
    exit 1
fi

# Generate summary report
echo -e "\n${YELLOW}📝 Generating Summary Report...${NC}"

cat > tests/optimization/BENCHMARK_SUMMARY.md << EOF
# Cal.com Dev Server Optimization Benchmark Results

**Date**: $(date)

## 🎯 Executive Summary

The optimizations implemented for the Cal.com dev server have been successfully tested and benchmarked.

### Key Results:
EOF

# Append dynamic results
node -e "
const perfReport = require('./tests/optimization/performance-report.json');
const intReport = require('./tests/optimization/integration-report.json');

const summary = \`
- **Baseline Performance**: \${perfReport.baseline.startupTime.toFixed(2)}s
- **Optimized Performance**: \${perfReport.optimized.startupTime.toFixed(2)}s
- **Improvement**: \${perfReport.improvements.startupTime.percentage}% faster
- **Time Saved**: \${perfReport.improvements.startupTime.seconds.toFixed(2)}s
- **Target Achievement**: \${perfReport.targetMet ? '✅ Met (<7s)' : '❌ Not Met'}

## 🧪 Integration Test Results

- **Total Tests**: \${intReport.summary.total}
- **Passed**: \${intReport.summary.passed}
- **Failed**: \${intReport.summary.failed}

## 🔧 Optimizations Verified

\${Object.entries(perfReport.verificationChecks)
  .map(([check, passed]) => \`- \${check}: \${passed ? '✅' : '❌'}\`)
  .join('\n')}

## 📊 Detailed Metrics

### Baseline
- Ready Time: \${perfReport.baseline.readyTime?.toFixed(2) || 'N/A'}s
- Compile Time: \${perfReport.baseline.compileTime?.toFixed(2) || 'N/A'}s
- Total Time: \${perfReport.baseline.startupTime.toFixed(2)}s

### Optimized
- Ready Time: \${perfReport.optimized.readyTime?.toFixed(2) || 'N/A'}s
- Compile Time: \${perfReport.optimized.compileTime?.toFixed(2) || 'N/A'}s
- Total Time: \${perfReport.optimized.startupTime.toFixed(2)}s

## 🚀 Next Steps

1. Review the detailed reports in \`tests/optimization/\`
2. Ensure all tests pass in CI/CD pipeline
3. Monitor performance in real-world usage
4. Consider additional optimizations if needed
\`;

console.log(summary);
" >> tests/optimization/BENCHMARK_SUMMARY.md

echo -e "\n${GREEN}✅ Benchmark complete!${NC}"
echo ""
echo "📊 Reports generated:"
echo "  - tests/optimization/performance-report.json"
echo "  - tests/optimization/integration-report.json"
echo "  - tests/optimization/BENCHMARK_SUMMARY.md"
echo ""
echo "🎉 All done!"