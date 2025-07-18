const { execSync } = require('child_process');
const fs = require('fs');

async function runAllBenchmarks() {
  console.log('🚀 Running comprehensive date library benchmarks...\n');
  
  try {
    console.log('1. Running baseline benchmark with adapters...');
    execSync('node --expose-gc benchmark-date-libraries.js', { stdio: 'inherit' });
    
    console.log('\n2. Running direct Luxon benchmark...');
    execSync('node --expose-gc benchmark-luxon.js', { stdio: 'inherit' });
    
    console.log('\n3. Running direct date-fns benchmark...');
    execSync('node --expose-gc benchmark-date-fns.js', { stdio: 'inherit' });
    
    console.log('\n📊 Consolidating results...');
    
    const baselineResults = JSON.parse(fs.readFileSync('benchmark-results.json', 'utf8'));
    const luxonResults = JSON.parse(fs.readFileSync('luxon-benchmark-results.json', 'utf8'));
    const dateFnsResults = JSON.parse(fs.readFileSync('date-fns-benchmark-results.json', 'utf8'));
    
    const consolidatedReport = {
      timestamp: new Date().toISOString(),
      summary: {
        'dayjs (baseline)': baselineResults.summary['dayjs (baseline)'],
        'Luxon (adapter)': baselineResults.summary['Luxon'],
        'Luxon (direct)': {
          executionTime: luxonResults.averages.executionTime,
          memoryDelta: luxonResults.averages.memoryDelta.heapUsed,
          slotsGenerated: luxonResults.averages.slotsGenerated,
          successRate: luxonResults.iterations.length / 15,
        },
        'date-fns (adapter)': baselineResults.summary['date-fns'] || { error: 'Failed to run' },
        'date-fns (direct)': {
          executionTime: dateFnsResults.averages.executionTime,
          memoryDelta: dateFnsResults.averages.memoryDelta.heapUsed,
          slotsGenerated: dateFnsResults.averages.slotsGenerated,
          successRate: dateFnsResults.iterations.length / 15,
        }
      },
      detailedResults: {
        baseline: baselineResults,
        luxonDirect: luxonResults,
        dateFnsDirect: dateFnsResults
      }
    };
    
    fs.writeFileSync('consolidated-benchmark-results.json', JSON.stringify(consolidatedReport, null, 2));
    
    console.log('\n📈 Final Performance Comparison:');
    console.log('================================');
    
    const baseline = consolidatedReport.summary['dayjs (baseline)'];
    
    Object.entries(consolidatedReport.summary).forEach(([library, results]) => {
      if (library === 'dayjs (baseline)') {
        console.log(`\n${library}:`);
        console.log(`  ⏱️  Execution time: ${results.executionTime.toFixed(2)}ms`);
        console.log(`  🧠 Memory delta: ${results.memoryDelta.toFixed(2)}MB`);
        console.log(`  📅 Slots generated: ${results.slotsGenerated.toFixed(0)}`);
        console.log(`  ✅ Success rate: ${(results.successRate * 100).toFixed(1)}%`);
      } else if (results.executionTime) {
        const speedRatio = baseline.executionTime / results.executionTime;
        const memoryChange = ((results.memoryDelta - baseline.memoryDelta) / baseline.memoryDelta) * 100;
        
        console.log(`\n${library}:`);
        console.log(`  ⏱️  Execution time: ${results.executionTime.toFixed(2)}ms`);
        console.log(`  🧠 Memory delta: ${results.memoryDelta.toFixed(2)}MB`);
        console.log(`  📅 Slots generated: ${results.slotsGenerated.toFixed(0)}`);
        console.log(`  ✅ Success rate: ${(results.successRate * 100).toFixed(1)}%`);
        console.log(`  🔄 vs dayjs: ${speedRatio > 1 ? speedRatio.toFixed(2) + 'x faster' : (1/speedRatio).toFixed(2) + 'x slower'}`);
        console.log(`  💾 Memory: ${memoryChange > 0 ? '+' : ''}${memoryChange.toFixed(1)}%`);
      } else {
        console.log(`\n${library}: ❌ Failed to run`);
      }
    });
    
    console.log('\n💾 Consolidated results saved to consolidated-benchmark-results.json');
    
  } catch (error) {
    console.error('❌ Benchmark execution failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  runAllBenchmarks().catch(console.error);
}
