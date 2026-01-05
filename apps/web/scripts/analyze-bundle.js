#!/usr/bin/env node
/**
 * Modern Next.js Bundle Analysis Script for App Router
 * 
 * This script analyzes the Next.js build output to provide:
 * - Shared bundle size (First Load JS shared by all)
 * - Per-route bundle sizes for App Router pages
 * - Comparison with base branch when available
 * 
 * Output: JSON file with bundle stats for CI comparison
 */

const process = require("node:process");
const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");

const NEXT_DIR = path.join(__dirname, '..', '.next');
const OUTPUT_DIR = path.join(NEXT_DIR, 'analyze');

function getFileSize(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch {
    return 0;
  }
}

function getGzipSize(filePath) {
  try {
    const content = fs.readFileSync(filePath);
    const gzipped = zlib.gzipSync(content);
    return gzipped.length;
  } catch {
    return 0;
  }
}

function loadJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function analyzeSharedBundle(buildManifest) {
  const shared = { files: [], raw: 0, gzip: 0 };
  const rootMainFiles = buildManifest.rootMainFiles || [];
  
  console.log('=== Shared Bundle (First Load JS shared by all) ===\n');
  
  for (const file of rootMainFiles) {
    const filePath = path.join(NEXT_DIR, file);
    const raw = getFileSize(filePath);
    const gzip = getGzipSize(filePath);
    
    shared.files.push({ file: path.basename(file), raw, gzip });
    shared.raw += raw;
    shared.gzip += gzip;
    
    console.log(`  ${path.basename(file)}: ${(raw / 1024).toFixed(2)} KB (${(gzip / 1024).toFixed(2)} KB gzip)`);
  }
  
  console.log(`\n  Total Shared: ${(shared.raw / 1024).toFixed(2)} KB (${(shared.gzip / 1024).toFixed(2)} KB gzip)\n`);
  
  return { shared, rootMainFiles };
}

function analyzeAppRouterRoutes(appBuildManifest, rootMainFiles, sharedGzip) {
  const routes = {};
  const routeStats = [];
  
  if (!appBuildManifest?.pages) {
    return { routes, largestRoutes: [] };
  }
  
  console.log('=== App Router Routes ===\n');
  
  for (const [route, chunks] of Object.entries(appBuildManifest.pages)) {
    const isApiRoute = route.startsWith('/api/');
    const uniqueChunks = chunks.filter(chunk => !rootMainFiles.includes(chunk));
    
    let routeRaw = 0;
    let routeGzip = 0;
    
    for (const chunk of uniqueChunks) {
      const filePath = path.join(NEXT_DIR, chunk);
      routeRaw += getFileSize(filePath);
      routeGzip += getGzipSize(filePath);
    }
    
    routes[route] = {
      raw: routeRaw,
      gzip: routeGzip,
      firstLoad: { raw: sharedGzip + routeRaw, gzip: sharedGzip + routeGzip },
      uniqueChunks: uniqueChunks.length,
      isApiRoute,
    };
    
    if (!isApiRoute) {
      routeStats.push({ route, gzip: routeGzip, firstLoad: sharedGzip + routeGzip });
    }
  }
  
  routeStats.sort((a, b) => b.firstLoad - a.firstLoad);
  const largestRoutes = routeStats.slice(0, 10).map(r => ({
    route: r.route,
    firstLoadGzip: r.firstLoad,
    uniqueGzip: r.gzip,
  }));
  
  console.log('Top 10 Largest Routes (by First Load JS):\n');
  for (const route of largestRoutes) {
    console.log(`  ${route.route}`);
    console.log(`    First Load: ${(route.firstLoadGzip / 1024).toFixed(2)} KB gzip`);
    console.log(`    Unique: ${(route.uniqueGzip / 1024).toFixed(2)} KB gzip\n`);
  }
  
  return { routes, largestRoutes };
}

function analyzePagesRouterPages(buildManifest) {
  const pages = {};
  
  if (!buildManifest.pages) {
    return pages;
  }
  
  const pagesRouterPages = Object.keys(buildManifest.pages).filter(p => !p.startsWith('/_'));
  
  if (pagesRouterPages.length === 0) {
    return pages;
  }
  
  console.log('=== Pages Router (Legacy) ===\n');
  
  for (const page of pagesRouterPages) {
    const chunks = buildManifest.pages[page];
    let pageRaw = 0;
    let pageGzip = 0;
    
    for (const chunk of chunks) {
      const filePath = path.join(NEXT_DIR, chunk);
      pageRaw += getFileSize(filePath);
      pageGzip += getGzipSize(filePath);
    }
    
    pages[page] = { raw: pageRaw, gzip: pageGzip };
    console.log(`  ${page}: ${(pageRaw / 1024).toFixed(2)} KB (${(pageGzip / 1024).toFixed(2)} KB gzip)`);
  }
  
  return pages;
}

function writeResults(results) {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  const outputPath = path.join(OUTPUT_DIR, '__bundle_analysis.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  
  console.log('\n=== Summary ===\n');
  console.log(`  First Load JS shared by all: ${(results.shared.gzip / 1024).toFixed(2)} KB gzip`);
  console.log(`  App Router routes: ${results.summary.totalRoutes}`);
  console.log(`  Pages Router pages: ${results.summary.totalPages}`);
  console.log(`\n  Output: ${outputPath}\n`);
}

function analyzeBundle() {
  console.log('Analyzing Next.js bundle for App Router...\n');

  const buildManifest = loadJson(path.join(NEXT_DIR, 'build-manifest.json'));
  const appBuildManifest = loadJson(path.join(NEXT_DIR, 'app-build-manifest.json'));

  if (!buildManifest) {
    console.error('Error: build-manifest.json not found. Run `next build` first.');
    process.exit(1);
  }

  const { shared, rootMainFiles } = analyzeSharedBundle(buildManifest);
  const { routes, largestRoutes } = analyzeAppRouterRoutes(appBuildManifest, rootMainFiles, shared.gzip);
  const pages = analyzePagesRouterPages(buildManifest);

  const results = {
    timestamp: new Date().toISOString(),
    shared,
    routes,
    pages,
    summary: {
      totalRoutes: Object.keys(routes).length,
      totalPages: Object.keys(pages).length,
      largestRoutes,
    },
  };

  writeResults(results);
  return results;
}

// Run analysis
analyzeBundle();
