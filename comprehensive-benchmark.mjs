import { performance } from 'perf_hooks';
import fs from 'fs';

// Comprehensive benchmark for date-ranges.ts comparing implementations
async function runComprehensiveBenchmark() {
  console.log('🚀 Starting Comprehensive Date-Ranges Performance Benchmark');
  console.log('='.repeat(70));
  
  try {
    // Import dayjs directly from node_modules
    const dayjs = (await import('dayjs')).default;
    const utc = (await import('dayjs/plugin/utc.js')).default;
    const timezone = (await import('dayjs/plugin/timezone.js')).default;
    
    dayjs.extend(utc);
    dayjs.extend(timezone);
    
    // Import date-fns functions
    const { addHours, addMinutes, isBefore, isAfter } = await import('date-fns');
    const { fromZonedTime, toZonedTime, getTimezoneOffset } = await import('date-fns-tz');
    
    const results = [];
    const iterations = 5000; // Thousands of operations as requested
    
    // Test 1: Date creation and manipulation (core date-ranges operations)
    console.log('\n📊 Testing date creation and manipulation (5000 iterations)...');
    const dateCreationResult = benchmark('dateCreation', () => {
      for (let i = 0; i < iterations; i++) {
        const date = dayjs().add(i % 365, 'day');
        date.startOf('day');
        date.endOf('day');
        date.hour(9);
        date.minute(30);
        date.toDate();
        date.valueOf();
      }
    }, 10);
    results.push(dateCreationResult);

    // Test 2: Date arithmetic operations (used heavily in date-ranges)
    console.log('\n📊 Testing date arithmetic (5000 iterations)...');
    const arithmeticResult = benchmark('dateArithmetic', () => {
      const baseDate = dayjs();
      for (let i = 0; i < iterations; i++) {
        baseDate.add(i % 24, 'hours').add(30, 'minutes');
        baseDate.subtract(i % 7, 'days');
        baseDate.isBefore(dayjs().add(1, 'month'));
        baseDate.isAfter(dayjs().subtract(1, 'month'));
      }
    }, 10);
    results.push(arithmeticResult);

    // Test 3: Timezone operations (critical for date-ranges.ts)
    console.log('\n📊 Testing timezone operations (2500 iterations)...');
    const timezoneResult = benchmark('timezoneOps', () => {
      const timeZones = ['America/New_York', 'Europe/London', 'Asia/Tokyo', 'America/Los_Angeles', 'Australia/Sydney'];
      for (let i = 0; i < iterations / 2; i++) {
        const date = dayjs().add(i % 100, 'day');
        timeZones.forEach(tz => {
          date.tz(tz);
          date.utcOffset();
          date.tz(tz, true);
        });
      }
    }, 10);
    results.push(timezoneResult);

    // Test 4: Date comparison and sorting (used in intersect/subtract functions)
    console.log('\n📊 Testing date comparisons and sorting (5000 iterations)...');
    const comparisonResult = benchmark('dateComparisons', () => {
      const dates = [];
      for (let i = 0; i < iterations; i++) {
        dates.push(dayjs().add(i % 1000, 'day'));
      }
      
      // Sort dates (similar to what happens in date-ranges.ts)
      dates.sort((a, b) => a.valueOf() - b.valueOf());
      
      // Compare dates
      for (let i = 0; i < Math.min(dates.length - 1, 1000); i++) {
        dates[i].isBefore(dates[i + 1]);
        dates[i].valueOf() < dates[i + 1].valueOf();
        dates[i].toDate().getTime() < dates[i + 1].toDate().getTime();
      }
    }, 5);
    results.push(comparisonResult);

    // Test 5: Date-fns specific operations (new in current implementation)
    console.log('\n📊 Testing date-fns operations (5000 iterations)...');
    const dateFnsResult = benchmark('dateFnsOps', () => {
      for (let i = 0; i < iterations; i++) {
        const baseDate = new Date();
        const date1 = addHours(baseDate, i % 24);
        const date2 = addMinutes(date1, i % 60);
        isBefore(date1, date2);
        isAfter(date2, date1);
        
        // Test timezone operations
        if (i % 100 === 0) {
          try {
            const tz = 'America/New_York';
            getTimezoneOffset(tz, baseDate);
            toZonedTime(baseDate, tz);
            fromZonedTime(baseDate, tz);
          } catch (e) {
            // Handle timezone errors gracefully
          }
        }
      }
    }, 10);
    results.push(dateFnsResult);

    // Test 6: Working hours simulation (core date-ranges.ts functionality)
    console.log('\n📊 Testing working hours simulation (1000 iterations)...');
    const workingHoursResult = benchmark('workingHours', () => {
      for (let i = 0; i < 1000; i++) {
        const startDate = dayjs().add(i % 30, 'day').startOf('day');
        const endDate = startDate.add(1, 'day');
        
        // Simulate working hours processing
        for (let hour = 9; hour <= 17; hour++) {
          const workStart = startDate.hour(hour).minute(0);
          const workEnd = startDate.hour(hour).minute(59);
          
          workStart.tz('America/New_York');
          workEnd.tz('America/New_York');
          workStart.utcOffset();
          workEnd.utcOffset();
          
          workStart.isBefore(endDate);
          workEnd.isAfter(startDate);
        }
      }
    }, 5);
    results.push(workingHoursResult);

    // Display results
    console.log('\n📈 COMPREHENSIVE BENCHMARK RESULTS');
    console.log('='.repeat(70));
    console.log('Operation'.padEnd(25) + 'Total (ms)'.padEnd(15) + 'Iterations'.padEnd(15) + 'Avg/Op (ms)');
    console.log('-'.repeat(70));
    
    results.forEach(result => {
      console.log(
        result.name.padEnd(25) + 
        result.duration.toFixed(2).padEnd(15) + 
        result.iterations.toString().padEnd(15) + 
        result.avgPerOperation.toFixed(4)
      );
    });

    const summary = {
      timestamp: new Date().toISOString(),
      implementation: process.env.BENCHMARK_BRANCH || 'current',
      totalOperations: results.reduce((sum, r) => sum + (r.iterations * (r.name === 'dateCreation' ? iterations : 
                                                                        r.name === 'dateArithmetic' ? iterations :
                                                                        r.name === 'timezoneOps' ? iterations / 2 :
                                                                        r.name === 'dateComparisons' ? iterations :
                                                                        r.name === 'dateFnsOps' ? iterations : 1000)), 0),
      results: results,
      summary: {
        totalDuration: results.reduce((sum, r) => sum + r.duration, 0),
        totalBenchmarkIterations: results.reduce((sum, r) => sum + r.iterations, 0)
      }
    };

    console.log('\n💾 Summary:');
    console.log(`Total benchmark duration: ${summary.summary.totalDuration.toFixed(2)}ms`);
    console.log(`Total benchmark iterations: ${summary.summary.totalBenchmarkIterations}`);
    console.log(`Total simulated operations: ${summary.totalOperations.toLocaleString()}`);
    console.log(`Average per benchmark iteration: ${(summary.summary.totalDuration / summary.summary.totalBenchmarkIterations).toFixed(4)}ms`);

    return summary;

  } catch (error) {
    console.error('❌ Benchmark failed:', error);
    throw error;
  }
}

// Benchmark function
function benchmark(name, fn, iterations = 1) {
  const start = performance.now();
  
  for (let i = 0; i < iterations; i++) {
    fn();
  }
  
  const end = performance.now();
  const duration = end - start;
  
  return {
    name,
    duration,
    iterations,
    avgPerOperation: duration / iterations
  };
}

// Run the benchmarks
runComprehensiveBenchmark()
  .then(results => {
    const branchName = process.env.BENCHMARK_BRANCH || 'current';
    const filename = `/home/ubuntu/benchmark-results-${branchName}.json`;
    fs.writeFileSync(filename, JSON.stringify(results, null, 2));
    console.log(`\n✅ Benchmark complete! Results saved to ${filename}`);
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Benchmark failed:', error);
    process.exit(1);
  });
