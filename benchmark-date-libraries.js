const { performance } = require('perf_hooks');
const { execSync } = require('child_process');
const fs = require('fs');

const BENCHMARK_CONFIG = {
  userCount: 88,
  iterations: 15,
  dateRangeWeeks: 3,
  timezones: ['UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Europe/Paris', 'Asia/Tokyo'],
  eventTypes: ['individual', 'team_collective', 'team_round_robin'],
};

function generateTestUsers() {
  const users = [];
  const timezones = BENCHMARK_CONFIG.timezones;
  
  for (let i = 0; i < BENCHMARK_CONFIG.userCount; i++) {
    users.push({
      id: i + 1,
      email: `user${i + 1}@example.com`,
      username: `user${i + 1}`,
      timeZone: timezones[i % timezones.length],
      defaultScheduleId: 1,
      availability: generateUserAvailability(i),
      hasConflicts: Math.random() > 0.7,
      outOfOffice: Math.random() > 0.9 ? generateOOODates() : null,
    });
  }
  
  return users;
}

function generateUserAvailability(userIndex) {
  const patterns = [
    { days: [1, 2, 3, 4, 5], startTime: '09:00', endTime: '17:00' },
    { days: [1, 2, 3], startTime: '09:00', endTime: '13:00' },
    { days: [1, 2, 3, 4, 5], startTime: '18:00', endTime: '22:00' },
    { days: [0, 6], startTime: '10:00', endTime: '16:00' },
    { days: [1, 3, 5], startTime: '11:00', endTime: '19:00' },
  ];
  
  return [patterns[userIndex % patterns.length]];
}

function generateOOODates() {
  const now = new Date();
  const start = new Date(now.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000);
  const end = new Date(start.getTime() + Math.random() * 5 * 24 * 60 * 60 * 1000);
  
  return {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    reason: 'Vacation',
  };
}

function createTeamScheduleInput(users) {
  const now = new Date();
  const startTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Tomorrow
  const endTime = new Date(startTime.getTime() + BENCHMARK_CONFIG.dateRangeWeeks * 7 * 24 * 60 * 60 * 1000);
  
  return {
    usernameList: users.slice(0, 10).map(u => u.username), // Use first 10 users for team event
    eventTypeSlug: 'team-meeting',
    isTeamEvent: true,
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    timeZone: 'UTC',
    duration: 60,
    eventTypeId: 1,
  };
}

function getMemoryUsage() {
  const usage = process.memoryUsage();
  return {
    rss: usage.rss / 1024 / 1024, // MB
    heapUsed: usage.heapUsed / 1024 / 1024, // MB
    heapTotal: usage.heapTotal / 1024 / 1024, // MB
    external: usage.external / 1024 / 1024, // MB
  };
}

async function runBenchmark(libraryName, setupFn) {
  console.log(`\n🚀 Running ${libraryName} benchmark...`);
  
  const results = {
    library: libraryName,
    iterations: [],
    averages: {},
    errors: [],
  };
  
  if (setupFn) {
    try {
      await setupFn();
    } catch (error) {
      console.error(`Setup failed for ${libraryName}:`, error.message);
      results.errors.push(`Setup failed: ${error.message}`);
      return results;
    }
  }
  
  const users = generateTestUsers();
  const input = createTeamScheduleInput(users);
  
  for (let i = 0; i < BENCHMARK_CONFIG.iterations; i++) {
    console.log(`  Iteration ${i + 1}/${BENCHMARK_CONFIG.iterations}`);
    
    const memoryBefore = getMemoryUsage();
    const startTime = performance.now();
    
    try {
      const result = await simulateTeamScheduleRequest(input);
      
      const endTime = performance.now();
      const memoryAfter = getMemoryUsage();
      
      const iteration = {
        iteration: i + 1,
        executionTime: endTime - startTime,
        memoryBefore,
        memoryAfter,
        memoryDelta: {
          rss: memoryAfter.rss - memoryBefore.rss,
          heapUsed: memoryAfter.heapUsed - memoryBefore.heapUsed,
          heapTotal: memoryAfter.heapTotal - memoryBefore.heapTotal,
        },
        slotsGenerated: result ? Object.keys(result.slots || {}).length : 0,
      };
      
      results.iterations.push(iteration);
      
    } catch (error) {
      console.error(`  Iteration ${i + 1} failed:`, error.message);
      results.errors.push(`Iteration ${i + 1}: ${error.message}`);
    }
    
    if (global.gc) {
      global.gc();
    }
    
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  if (results.iterations.length > 0) {
    const validIterations = results.iterations.filter(i => i.executionTime > 0);
    
    if (validIterations.length > 0) {
      results.averages = {
        executionTime: validIterations.reduce((sum, i) => sum + i.executionTime, 0) / validIterations.length,
        memoryDelta: {
          rss: validIterations.reduce((sum, i) => sum + i.memoryDelta.rss, 0) / validIterations.length,
          heapUsed: validIterations.reduce((sum, i) => sum + i.memoryDelta.heapUsed, 0) / validIterations.length,
        },
        slotsGenerated: validIterations.reduce((sum, i) => sum + i.slotsGenerated, 0) / validIterations.length,
      };
    }
  }
  
  return results;
}

async function simulateTeamScheduleRequest(input) {
  const dayjs = require('dayjs');
  const utc = require('dayjs/plugin/utc');
  const timezone = require('dayjs/plugin/timezone');
  
  dayjs.extend(utc);
  dayjs.extend(timezone);
  
  const slots = {};
  const users = generateTestUsers();
  
  const startDate = dayjs(input.startTime);
  const endDate = dayjs(input.endTime);
  
  const minimumBookingNotice = 60;
  const startTimeWithMinNotice = dayjs.utc().add(minimumBookingNotice, 'minutes');
  const adjustedStartTime = startTimeWithMinNotice.isAfter(startDate) 
    ? startTimeWithMinNotice.tz(input.timeZone) 
    : startDate;
  
  for (let userIndex = 0; userIndex < Math.min(users.length, 20); userIndex++) {
    const user = users[userIndex];
    let currentDate = adjustedStartTime.tz(user.timeZone);
    
    while (currentDate.isBefore(endDate)) {
      const dateKey = currentDate.format('YYYY-MM-DD');
      
      if (!slots[dateKey]) {
        slots[dateKey] = [];
      }
      
      for (const availability of user.availability) {
        if (availability.days.includes(currentDate.day())) {
          const fromOffset = currentDate.startOf('day').utcOffset();
          const offset = currentDate.tz(user.timeZone).utcOffset();
          const dateInTz = currentDate.add(fromOffset - offset, 'minutes').tz(user.timeZone);
          
          const [startHour, startMin] = availability.startTime.split(':').map(Number);
          const [endHour, endMin] = availability.endTime.split(':').map(Number);
          
          let slotStart = dateInTz.hour(startHour).minute(startMin);
          const slotEnd = dateInTz.hour(endHour).minute(endMin);
          
          const frequency = 30;
          while (slotStart.add(input.duration || 60, 'minutes').isBefore(slotEnd)) {
            const utcSlot = slotStart.utc();
            const localSlot = utcSlot.tz(input.timeZone);
            
            const slotKey = localSlot.toISOString();
            const formattedTime = localSlot.format('YYYY-MM-DD HH:mm:ss');
            
            slots[dateKey].push({
              time: slotKey,
              formatted: formattedTime,
              userId: user.id,
              timezone: user.timeZone,
              utcOffset: localSlot.utcOffset(),
            });
            
            slotStart = slotStart.add(frequency, 'minutes');
          }
        }
      }
      
      currentDate = currentDate.add(1, 'day');
    }
  }
  
  const totalSlots = Object.values(slots).flat();
  const filteredSlots = totalSlots.filter(slot => {
    const slotTime = dayjs(slot.time);
    return slotTime.isAfter(dayjs.utc().add(minimumBookingNotice, 'minutes'));
  });
  
  const dateRanges = [];
  Object.keys(slots).forEach(dateKey => {
    const dayStart = dayjs(dateKey).startOf('day');
    const dayEnd = dayStart.endOf('day');
    
    dateRanges.push({
      start: dayStart,
      end: dayEnd,
      slotsCount: slots[dateKey].length,
    });
  });
  
  return { 
    slots: filteredSlots,
    dateRanges,
    totalOperations: filteredSlots.length * 5,
  };
}

async function setupLuxon() {
  const luxonAdapter = require('./lib-adapters/luxon-adapter');
  
  const Module = require('module');
  const originalRequire = Module.prototype.require;
  
  Module.prototype.require = function(id) {
    if (id === 'dayjs' || id.includes('dayjs')) {
      return luxonAdapter;
    }
    return originalRequire.apply(this, arguments);
  };
}

async function setupDateFns() {
  const dateFnsAdapter = require('./lib-adapters/date-fns-adapter');
  
  const Module = require('module');
  const originalRequire = Module.prototype.require;
  
  Module.prototype.require = function(id) {
    if (id === 'dayjs' || id.includes('dayjs')) {
      return dateFnsAdapter;
    }
    return originalRequire.apply(this, arguments);
  };
}

async function setupNativeDate() {
  const nativeDateAdapter = require('./packages/lib/native-date-dayjs');
  
  const Module = require('module');
  const originalRequire = Module.prototype.require;
  
  Module.prototype.require = function(id) {
    if (id === 'dayjs' || id.includes('dayjs')) {
      return nativeDateAdapter;
    }
    return originalRequire.apply(this, arguments);
  };
}

async function main() {
  console.log('📊 Cal.com Date Library Benchmark Suite');
  console.log('========================================');
  console.log(`Configuration:`);
  console.log(`  Users: ${BENCHMARK_CONFIG.userCount}`);
  console.log(`  Iterations: ${BENCHMARK_CONFIG.iterations}`);
  console.log(`  Date Range: ${BENCHMARK_CONFIG.dateRangeWeeks} weeks`);
  console.log(`  Timezones: ${BENCHMARK_CONFIG.timezones.join(', ')}`);
  
  const allResults = [];
  
  const dayjsResults = await runBenchmark('dayjs (baseline)', null);
  allResults.push(dayjsResults);
  
  const luxonResults = await runBenchmark('Luxon', setupLuxon);
  allResults.push(luxonResults);
  
  const dateFnsResults = await runBenchmark('date-fns', setupDateFns);
  allResults.push(dateFnsResults);
  
  const nativeDateResults = await runBenchmark('native-date', setupNativeDate);
  allResults.push(nativeDateResults);
  
  generateReport(allResults);
}

function generateReport(results) {
  console.log('\n📈 Benchmark Results');
  console.log('====================');
  
  const report = {
    timestamp: new Date().toISOString(),
    configuration: BENCHMARK_CONFIG,
    results: results,
    summary: {},
  };
  
  results.forEach(result => {
    console.log(`\n${result.library}:`);
    
    if (result.errors.length > 0) {
      console.log(`  ❌ Errors: ${result.errors.length}`);
      result.errors.forEach(error => console.log(`    - ${error}`));
    }
    
    if (result.averages.executionTime) {
      console.log(`  ⏱️  Average execution time: ${result.averages.executionTime.toFixed(2)}ms`);
      console.log(`  🧠 Average memory delta: ${result.averages.memoryDelta.heapUsed.toFixed(2)}MB`);
      console.log(`  📅 Average slots generated: ${result.averages.slotsGenerated.toFixed(0)}`);
      console.log(`  ✅ Successful iterations: ${result.iterations.length}/${BENCHMARK_CONFIG.iterations}`);
      
      report.summary[result.library] = {
        executionTime: result.averages.executionTime,
        memoryDelta: result.averages.memoryDelta.heapUsed,
        slotsGenerated: result.averages.slotsGenerated,
        successRate: result.iterations.length / BENCHMARK_CONFIG.iterations,
      };
    } else {
      console.log(`  ❌ No successful iterations`);
    }
  });
  
  fs.writeFileSync('benchmark-results.json', JSON.stringify(report, null, 2));
  console.log('\n💾 Detailed results saved to benchmark-results.json');
  
  if (results.length > 1) {
    console.log('\n🔄 Performance Comparison:');
    const baseline = results[0];
    
    if (baseline.averages.executionTime) {
      results.slice(1).forEach(result => {
        if (result.averages.executionTime) {
          const speedup = baseline.averages.executionTime / result.averages.executionTime;
          const memoryChange = ((result.averages.memoryDelta.heapUsed - baseline.averages.memoryDelta.heapUsed) / baseline.averages.memoryDelta.heapUsed) * 100;
          
          console.log(`  ${result.library} vs ${baseline.library}:`);
          console.log(`    Speed: ${speedup > 1 ? speedup.toFixed(2) + 'x faster' : (1/speedup).toFixed(2) + 'x slower'}`);
          console.log(`    Memory: ${memoryChange > 0 ? '+' : ''}${memoryChange.toFixed(1)}%`);
        }
      });
    }
  }
}

if (require.main === module) {
  if (global.gc) {
    console.log('🗑️  Garbage collection enabled for accurate memory measurements');
  } else {
    console.log('⚠️  Run with --expose-gc for more accurate memory measurements');
  }
  
  main().catch(console.error);
}

module.exports = {
  runBenchmark,
  generateTestUsers,
  createTeamScheduleInput,
  simulateTeamScheduleRequest,
  BENCHMARK_CONFIG,
};
