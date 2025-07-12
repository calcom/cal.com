#!/bin/bash

# Bundle Analysis Script for Cal.com
# This script provides comprehensive bundle analysis and performance insights

set -e

echo "🚀 Cal.com Bundle Analysis Tool"
echo "================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "apps/web/next.config.js" ]; then
    print_error "Please run this script from the root of the Cal.com repository"
    exit 1
fi

# Navigate to web app directory
cd apps/web

print_status "Cleaning previous builds..."
rm -rf .next
rm -rf out

print_status "Installing dependencies..."
yarn install --frozen-lockfile

print_status "Building application with bundle analysis..."
ANALYZE=true yarn build

print_status "Generating bundle report..."
cat > bundle-report.json << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "analysis": {
    "total_chunks": "$(find .next/static/chunks -name '*.js' | wc -l)",
    "total_size": "$(du -sh .next/static/chunks | cut -f1)",
    "largest_files": [
$(find .next/static/chunks -name '*.js' -exec du -h {} + | sort -hr | head -10 | sed 's/.*\t/      "/' | sed 's/$/",/')
    ]
  }
}
EOF

print_status "Bundle analysis complete!"
echo "📊 Results:"
echo "  • Total chunks: $(find .next/static/chunks -name '*.js' | wc -l)"
echo "  • Total size: $(du -sh .next/static/chunks | cut -f1)"
echo "  • Report saved to: bundle-report.json"

echo ""
echo "🔍 Top 10 largest files:"
find .next/static/chunks -name '*.js' -exec du -h {} + | sort -hr | head -10

echo ""
print_status "Opening bundle analyzer in browser..."
if command -v open &> /dev/null; then
    open http://localhost:8888
elif command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:8888
else
    echo "Please open http://localhost:8888 in your browser"
fi

echo ""
echo "✅ Bundle analysis completed successfully!"
echo "📈 To track performance improvements, run this script regularly and compare results."