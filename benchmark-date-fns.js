const { performance } = require('perf_hooks');
const fs = require('fs');

const { runBenchmark, generateTestUsers, createTeamScheduleInput, BENCHMARK_CONFIG } = require('./benchmark-date-libraries');

async function simulateTeamScheduleRequestDateFns(input) {
  const {
    parseISO,
    addMinutes,
    addDays,
    format,
    startOfDay,
    setHours,
    setMinutes,
    getDay,
    isBefore,
    isAfter,
  } = require('date-fns');
  const { utcToZonedTime, zonedTimeToUtc } = require('date-fns-tz');
  
  const slots = {};
  const users = generateTestUsers();
  
  const startDate = parseISO(input.startTime);
  const endDate = parseISO(input.endTime);
  
  const minimumBookingNotice = 60;
  const startTimeWithMinNotice = addMinutes(new Date(), minimumBookingNotice);
  const adjustedStartTime = isAfter(startTimeWithMinNotice, startDate) 
    ? utcToZonedTime(startTimeWithMinNotice, input.timeZone) 
    : startDate;
  
  for (let userIndex = 0; userIndex < Math.min(users.length, 20); userIndex++) {
    const user = users[userIndex];
    let currentDate = utcToZonedTime(adjustedStartTime, user.timeZone);
    
    while (isBefore(currentDate, endDate)) {
      const dateKey = format(currentDate, 'yyyy-MM-dd');
      
      if (!slots[dateKey]) {
        slots[dateKey] = [];
      }
      
      for (const availability of user.availability) {
        const dayOfWeek = getDay(currentDate);
        if (availability.days.includes(dayOfWeek)) {
          const dateInTz = utcToZonedTime(startOfDay(currentDate), user.timeZone);
          
          const [startHour, startMin] = availability.startTime.split(':').map(Number);
          const [endHour, endMin] = availability.endTime.split(':').map(Number);
          
          let slotStart = setMinutes(setHours(dateInTz, startHour), startMin);
          const slotEnd = setMinutes(setHours(dateInTz, endHour), endMin);
          
          const frequency = 30;
          while (isBefore(addMinutes(slotStart, input.duration || 60), slotEnd)) {
            const utcSlot = zonedTimeToUtc(slotStart, user.timeZone);
            const localSlot = utcToZonedTime(utcSlot, input.timeZone);
            
            const slotKey = localSlot.toISOString();
            const formattedTime = format(localSlot, 'yyyy-MM-dd HH:mm:ss');
            
            slots[dateKey].push({
              time: slotKey,
              formatted: formattedTime,
              userId: user.id,
              timezone: user.timeZone,
              utcOffset: localSlot.getTimezoneOffset(),
            });
            
            slotStart = addMinutes(slotStart, frequency);
          }
        }
      }
      
      currentDate = addDays(currentDate, 1);
    }
  }
  
  const totalSlots = Object.values(slots).flat();
  const filteredSlots = totalSlots.filter(slot => {
    const slotTime = parseISO(slot.time);
    return isAfter(slotTime, addMinutes(new Date(), minimumBookingNotice));
  });
  
  return { 
    slots: filteredSlots,
    totalOperations: filteredSlots.length * 5,
  };
}

async function main() {
  console.log('🚀 Running date-fns-specific benchmark...');
  
  global.simulateTeamScheduleRequest = simulateTeamScheduleRequestDateFns;
  
  const results = await runBenchmark('date-fns (direct)', null);
  
  console.log('\n📈 date-fns Benchmark Results');
  console.log('=============================');
  
  if (results.averages.executionTime) {
    console.log(`⏱️  Average execution time: ${results.averages.executionTime.toFixed(2)}ms`);
    console.log(`🧠 Average memory delta: ${results.averages.memoryDelta.heapUsed.toFixed(2)}MB`);
    console.log(`📅 Average slots generated: ${results.averages.slotsGenerated.toFixed(0)}`);
    console.log(`✅ Successful iterations: ${results.iterations.length}/${BENCHMARK_CONFIG.iterations}`);
  }
  
  fs.writeFileSync('date-fns-benchmark-results.json', JSON.stringify(results, null, 2));
  console.log('\n💾 Results saved to date-fns-benchmark-results.json');
}

if (require.main === module) {
  main().catch(console.error);
}
