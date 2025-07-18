const { execSync } = require('child_process');
const fs = require('fs');

async function runComprehensiveBenchmarks() {
  console.log('🚀 Running comprehensive date library benchmarks for Cal.com team scheduling...\n');
  
  try {
    console.log('📊 Running baseline benchmark with adapters...');
    execSync('TZ=UTC node --expose-gc benchmark-date-libraries.js', { stdio: 'inherit' });
    
    console.log('\n📈 Consolidating and analyzing results...');
    
    const results = JSON.parse(fs.readFileSync('benchmark-results.json', 'utf8'));
    
    console.log('\n🎯 Final Performance Analysis for 88-User Team Scheduling');
    console.log('=========================================================');
    
    const baseline = results.summary['dayjs (baseline)'];
    
    if (baseline) {
      console.log(`\n✅ dayjs (baseline):`);
      console.log(`   ⏱️  Execution time: ${baseline.executionTime.toFixed(2)}ms`);
      console.log(`   🧠 Memory usage: ${baseline.memoryDelta.toFixed(2)}MB`);
      console.log(`   📅 Slots generated: ${baseline.slotsGenerated.toFixed(0)}`);
      console.log(`   ✅ Success rate: ${(baseline.successRate * 100).toFixed(1)}%`);
    }
    
    Object.entries(results.summary).forEach(([library, metrics]) => {
      if (library !== 'dayjs (baseline)' && metrics.executionTime) {
        const speedRatio = baseline.executionTime / metrics.executionTime;
        const memoryChange = ((metrics.memoryDelta - baseline.memoryDelta) / baseline.memoryDelta) * 100;
        
        console.log(`\n📊 ${library}:`);
        console.log(`   ⏱️  Execution time: ${metrics.executionTime.toFixed(2)}ms`);
        console.log(`   🧠 Memory usage: ${metrics.memoryDelta.toFixed(2)}MB`);
        console.log(`   📅 Slots generated: ${metrics.slotsGenerated.toFixed(0)}`);
        console.log(`   ✅ Success rate: ${(metrics.successRate * 100).toFixed(1)}%`);
        console.log(`   🔄 vs dayjs: ${speedRatio > 1 ? speedRatio.toFixed(2) + 'x faster' : (1/speedRatio).toFixed(2) + 'x slower'}`);
        console.log(`   💾 Memory: ${memoryChange > 0 ? '+' : ''}${memoryChange.toFixed(1)}%`);
      } else if (library !== 'dayjs (baseline)') {
        console.log(`\n❌ ${library}: Failed to run successfully`);
      }
    });
    
    console.log('\n📋 Summary & Recommendations:');
    console.log('==============================');
    
    if (results.summary['Luxon'] && results.summary['Luxon'].executionTime) {
      const luxonRatio = baseline.executionTime / results.summary['Luxon'].executionTime;
      if (luxonRatio > 1) {
        console.log('🏆 Luxon shows performance improvements over dayjs');
      } else {
        console.log('⚠️  Luxon is slower than dayjs but provides better timezone handling');
      }
    }
    
    if (results.summary['date-fns'] && results.summary['date-fns'].executionTime) {
      const dateFnsRatio = baseline.executionTime / results.summary['date-fns'].executionTime;
      if (dateFnsRatio > 1) {
        console.log('🏆 date-fns shows performance improvements over dayjs');
      } else {
        console.log('⚠️  date-fns is slower than dayjs but offers modular imports');
      }
    }
    
    if (results.summary['native-date'] && results.summary['native-date'].executionTime) {
      const nativeDateRatio = baseline.executionTime / results.summary['native-date'].executionTime;
      if (nativeDateRatio > 1) {
        console.log('🚀 native-date shows significant performance improvements over dayjs');
      } else {
        console.log('⚠️  native-date is slower than dayjs but has zero dependencies');
      }
    }
    
    console.log('\n💾 Detailed results saved to benchmark-results.json');
    console.log('🎉 Benchmark analysis complete!');
    
  } catch (error) {
    console.error('❌ Benchmark execution failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  runComprehensiveBenchmarks().catch(console.error);
}
