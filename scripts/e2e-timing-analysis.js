#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Analyze E2E test timing data and generate optimization recommendations
 */
class E2ETimingAnalyzer {
  constructor(timingDataPath = './timing-reports') {
    this.timingDataPath = timingDataPath;
    this.testFiles = [];
    this.shardData = [];
  }

  async loadTimingData() {
    try {
      const files = fs.readdirSync(this.timingDataPath);
      
      for (const file of files) {
        if (file.endsWith('-timing.json')) {
          const filePath = path.join(this.timingDataPath, file);
          const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          this.shardData.push(data);
        }
      }
      
      console.log(`Loaded timing data for ${this.shardData.length} shards`);
    } catch (error) {
      console.error('Error loading timing data:', error.message);
    }
  }

  analyzeTestFiles() {
    const playwrightDir = './apps/web/playwright';
    
    if (!fs.existsSync(playwrightDir)) {
      console.error('Playwright directory not found');
      return;
    }

    const scanDirectory = (dir) => {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          scanDirectory(fullPath);
        } else if (item.endsWith('.e2e.ts')) {
          const content = fs.readFileSync(fullPath, 'utf8');
          const lines = content.split('\n').length;
          const testCount = (content.match(/test\(/g) || []).length;
          const skipCount = (content.match(/test\.skip\(/g) || []).length;
          const fixmeCount = (content.match(/test\.fixme\(/g) || []).length;
          
          this.testFiles.push({
            path: fullPath.replace('./apps/web/playwright/', ''),
            lines,
            testCount,
            skipCount,
            fixmeCount,
            hasParallel: content.includes('test.describe.configure({ mode: "parallel" })'),
            usesBookingFlow: content.includes('bookTimeSlot') || content.includes('selectFirstAvailableTimeSlotNextMonth'),
            category: this.categorizeTest(fullPath, content)
          });
        }
      }
    };

    scanDirectory(playwrightDir);
    console.log(`Analyzed ${this.testFiles.length} E2E test files`);
  }

  categorizeTest(filePath, content) {
    if (filePath.includes('booking')) return 'booking';
    if (filePath.includes('organization')) return 'organization';
    if (filePath.includes('login') || filePath.includes('auth')) return 'auth';
    if (filePath.includes('payment')) return 'payment';
    if (filePath.includes('integration')) return 'integration';
    if (filePath.includes('webhook')) return 'webhook';
    return 'other';
  }

  generateOptimizationReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalFiles: this.testFiles.length,
        totalTests: this.testFiles.reduce((sum, file) => sum + file.testCount, 0),
        skippedTests: this.testFiles.reduce((sum, file) => sum + file.skipCount, 0),
        fixmeTests: this.testFiles.reduce((sum, file) => sum + file.fixmeCount, 0),
        totalLines: this.testFiles.reduce((sum, file) => sum + file.lines, 0)
      },
      shardTiming: this.shardData,
      consolidationOpportunities: this.findConsolidationOpportunities(),
      recommendations: this.generateRecommendations()
    };

    return report;
  }

  findConsolidationOpportunities() {
    const opportunities = [];
    const categories = {};

    this.testFiles.forEach(file => {
      if (!categories[file.category]) {
        categories[file.category] = [];
      }
      categories[file.category].push(file);
    });

    Object.entries(categories).forEach(([category, files]) => {
      if (files.length > 1) {
        const totalLines = files.reduce((sum, file) => sum + file.lines, 0);
        const totalTests = files.reduce((sum, file) => sum + file.testCount, 0);
        const bookingFlowFiles = files.filter(file => file.usesBookingFlow);

        if (bookingFlowFiles.length > 1 || totalLines > 1000) {
          opportunities.push({
            category,
            files: files.map(f => f.path),
            totalLines,
            totalTests,
            estimatedReduction: Math.floor(totalLines * 0.3), // Estimate 30% reduction
            priority: this.calculatePriority(category, files)
          });
        }
      }
    });

    return opportunities.sort((a, b) => b.priority - a.priority);
  }

  calculatePriority(category, files) {
    let priority = 0;
    
    priority += files.length * 10;
    
    if (category === 'booking') priority += 50;
    
    const problematicTests = files.reduce((sum, file) => sum + file.skipCount + file.fixmeCount, 0);
    priority += problematicTests * 5;
    
    const avgLines = files.reduce((sum, file) => sum + file.lines, 0) / files.length;
    priority += Math.floor(avgLines / 100);
    
    return priority;
  }

  generateRecommendations() {
    const recommendations = [];

    const problematicFiles = this.testFiles.filter(file => file.skipCount > 0 || file.fixmeCount > 0);
    if (problematicFiles.length > 0) {
      recommendations.push({
        type: 'cleanup',
        priority: 'high',
        description: 'Remove or fix skipped/fixme tests',
        files: problematicFiles.map(f => f.path),
        estimatedTimeSaving: '10-15%'
      });
    }

    const bookingFiles = this.testFiles.filter(file => file.category === 'booking');
    if (bookingFiles.length > 2) {
      recommendations.push({
        type: 'consolidation',
        priority: 'high',
        description: 'Merge booking-related test files',
        files: bookingFiles.map(f => f.path),
        estimatedTimeSaving: '25-30%'
      });
    }

    if (this.shardData.length > 0) {
      const avgDuration = this.shardData.reduce((sum, shard) => sum + shard.duration, 0) / this.shardData.length;
      const maxDuration = Math.max(...this.shardData.map(s => s.duration));
      const minDuration = Math.min(...this.shardData.map(s => s.duration));
      
      if (maxDuration - minDuration > avgDuration * 0.3) {
        recommendations.push({
          type: 'sharding',
          priority: 'medium',
          description: 'Rebalance test shards for more even distribution',
          details: `Max: ${maxDuration}s, Min: ${minDuration}s, Avg: ${Math.round(avgDuration)}s`,
          estimatedTimeSaving: '10-15%'
        });
      }
    }

    return recommendations;
  }

  async run() {
    console.log('🔍 Starting E2E timing analysis...\n');
    
    await this.loadTimingData();
    this.analyzeTestFiles();
    
    const report = this.generateOptimizationReport();
    
    console.log('📊 Analysis Results:');
    console.log(`- Total test files: ${report.summary.totalFiles}`);
    console.log(`- Total tests: ${report.summary.totalTests}`);
    console.log(`- Skipped tests: ${report.summary.skippedTests}`);
    console.log(`- Fixme tests: ${report.summary.fixmeTests}`);
    console.log(`- Total lines of code: ${report.summary.totalLines}\n`);

    if (report.shardTiming.length > 0) {
      console.log('⏱️  Shard Timing:');
      report.shardTiming.forEach(shard => {
        console.log(`- Shard ${shard.shard}: ${shard.duration}s (${Math.round(shard.duration/60)}m)`);
      });
      console.log();
    }

    console.log('🎯 Top Consolidation Opportunities:');
    report.consolidationOpportunities.slice(0, 5).forEach((opp, index) => {
      console.log(`${index + 1}. ${opp.category} (${opp.files.length} files, ${opp.totalLines} lines)`);
      console.log(`   Estimated reduction: ${opp.estimatedReduction} lines`);
      console.log(`   Priority: ${opp.priority}`);
    });
    console.log();

    console.log('💡 Recommendations:');
    report.recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. [${rec.priority.toUpperCase()}] ${rec.description}`);
      console.log(`   Estimated time saving: ${rec.estimatedTimeSaving}`);
    });

    fs.writeFileSync('e2e-optimization-report.json', JSON.stringify(report, null, 2));
    console.log('\n📄 Detailed report saved to: e2e-optimization-report.json');
  }
}

if (require.main === module) {
  const analyzer = new E2ETimingAnalyzer();
  analyzer.run().catch(console.error);
}

module.exports = E2ETimingAnalyzer;
