const { GoogleApiCache } = require('./packages/app-store/_utils/googleapis/GoogleApiCache');

async function testCaching() {
  const cache = new GoogleApiCache(123, { cacheWindowMs: 5000 });
  
  let callCount = 0;
  const mockApiCall = async () => {
    callCount++;
    console.log(`API call #${callCount}`);
    return { data: `response-${callCount}` };
  };

  console.log('Making first call...');
  const result1 = await cache.dedupe('calendar.events.list', { calendarId: 'primary' }, mockApiCall);
  console.log('Result 1:', result1);

  console.log('Making identical call (should be cached)...');
  const result2 = await cache.dedupe('calendar.events.list', { calendarId: 'primary' }, mockApiCall);
  console.log('Result 2:', result2);

  console.log('Making different call...');
  const result3 = await cache.dedupe('calendar.events.list', { calendarId: 'secondary' }, mockApiCall);
  console.log('Result 3:', result3);

  console.log(`Total API calls made: ${callCount} (should be 2)`);
  console.log('Cache stats:', cache.getCacheStats());
}

testCaching().catch(console.error);
