const { performance } = require('perf_hooks');
const fs = require('fs');

const { runBenchmark, generateTestUsers, createTeamScheduleInput, BENCHMARK_CONFIG } = require('./benchmark-date-libraries');

async function simulateTeamScheduleRequestLuxon(input) {
  const { DateTime } = require('luxon');
  
  const slots = {};
  const users = generateTestUsers();
  
  const startDate = DateTime.fromISO(input.startTime);
  const endDate = DateTime.fromISO(input.endTime);
  
  const minimumBookingNotice = 60;
  const startTimeWithMinNotice = DateTime.utc().plus({ minutes: minimumBookingNotice });
  const adjustedStartTime = startTimeWithMinNotice > startDate 
    ? startTimeWithMinNotice.setZone(input.timeZone) 
    : startDate;
  
  for (let userIndex = 0; userIndex < Math.min(users.length, 20); userIndex++) {
    const user = users[userIndex];
    let currentDate = adjustedStartTime.setZone(user.timeZone);
    
    while (currentDate < endDate) {
      const dateKey = currentDate.toFormat('yyyy-MM-dd');
      
      if (!slots[dateKey]) {
        slots[dateKey] = [];
      }
      
      for (const availability of user.availability) {
        const dayOfWeek = currentDate.weekday === 7 ? 0 : currentDate.weekday;
        if (availability.days.includes(dayOfWeek)) {
          const fromOffset = currentDate.startOf('day').offset;
          const offset = currentDate.setZone(user.timeZone).offset;
          const dateInTz = currentDate.plus({ minutes: fromOffset - offset }).setZone(user.timeZone);
          
          const [startHour, startMin] = availability.startTime.split(':').map(Number);
          const [endHour, endMin] = availability.endTime.split(':').map(Number);
          
          let slotStart = dateInTz.set({ hour: startHour, minute: startMin });
          const slotEnd = dateInTz.set({ hour: endHour, minute: endMin });
          
          const frequency = 30;
          while (slotStart.plus({ minutes: input.duration || 60 }) < slotEnd) {
            const utcSlot = slotStart.toUTC();
            const localSlot = utcSlot.setZone(input.timeZone);
            
            const slotKey = localSlot.toISO();
            const formattedTime = localSlot.toFormat('yyyy-MM-dd HH:mm:ss');
            
            slots[dateKey].push({
              time: slotKey,
              formatted: formattedTime,
              userId: user.id,
              timezone: user.timeZone,
              utcOffset: localSlot.offset,
            });
            
            slotStart = slotStart.plus({ minutes: frequency });
          }
        }
      }
      
      currentDate = currentDate.plus({ days: 1 });
    }
  }
  
  const totalSlots = Object.values(slots).flat();
  const filteredSlots = totalSlots.filter(slot => {
    const slotTime = DateTime.fromISO(slot.time);
    return slotTime > DateTime.utc().plus({ minutes: minimumBookingNotice });
  });
  
  return { 
    slots: filteredSlots,
    totalOperations: filteredSlots.length * 5,
  };
}

async function main() {
  console.log('🚀 Running Luxon-specific benchmark...');
  
  global.simulateTeamScheduleRequest = simulateTeamScheduleRequestLuxon;
  
  const results = await runBenchmark('Luxon (direct)', null);
  
  console.log('\n📈 Luxon Benchmark Results');
  console.log('==========================');
  
  if (results.averages.executionTime) {
    console.log(`⏱️  Average execution time: ${results.averages.executionTime.toFixed(2)}ms`);
    console.log(`🧠 Average memory delta: ${results.averages.memoryDelta.heapUsed.toFixed(2)}MB`);
    console.log(`📅 Average slots generated: ${results.averages.slotsGenerated.toFixed(0)}`);
    console.log(`✅ Successful iterations: ${results.iterations.length}/${BENCHMARK_CONFIG.iterations}`);
  }
  
  fs.writeFileSync('luxon-benchmark-results.json', JSON.stringify(results, null, 2));
  console.log('\n💾 Results saved to luxon-benchmark-results.json');
}

if (require.main === module) {
  main().catch(console.error);
}
