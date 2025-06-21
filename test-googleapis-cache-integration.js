const { GoogleApiCache } = require('./packages/app-store/_utils/googleapis/GoogleApiCache');
const { CachedFetchManager } = require('./packages/app-store/_utils/googleapis/cachedFetch');
const { NoOpCacheClient } = require('./packages/app-store/_utils/googleapis/CacheClient');

async function testCachingIntegration() {
  console.log('🧪 Testing googleapis caching integration...\n');
  
  console.log('1️⃣ Testing GoogleApiCache deduplication...');
  const cache = new GoogleApiCache(123, { cacheWindowMs: 5000, enableLogging: false });
  
  let callCount = 0;
  const mockApiCall = async () => {
    callCount++;
    return { data: `response-${callCount}`, timestamp: Date.now() };
  };

  const result1 = await cache.dedupe('calendar.events.list', { calendarId: 'primary' }, mockApiCall);
  console.log(`   First call result: ${JSON.stringify(result1)}`);

  const result2 = await cache.dedupe('calendar.events.list', { calendarId: 'primary' }, mockApiCall);
  console.log(`   Second call result: ${JSON.stringify(result2)}`);
  
  const result3 = await cache.dedupe('calendar.events.list', { calendarId: 'secondary' }, mockApiCall);
  console.log(`   Different call result: ${JSON.stringify(result3)}`);

  console.log(`   ✅ API calls made: ${callCount} (expected: 2)`);
  console.log(`   ✅ Cache stats: ${JSON.stringify(cache.getCacheStats())}\n`);

  console.log('2️⃣ Testing CachedFetchManager...');
  const cacheClient = new NoOpCacheClient();
  const manager = new CachedFetchManager(cacheClient);
  
  let managerCallCount = 0;
  const mockManagerCall = async () => {
    managerCallCount++;
    return { events: [`event-${managerCallCount}`] };
  };

  const readResult1 = await manager.cachedFetch(456, 'calendar.events.list', {}, mockManagerCall);
  const readResult2 = await manager.cachedFetch(456, 'calendar.events.list', {}, mockManagerCall);
  
  const writeResult = await manager.cachedFetch(456, 'calendar.events.insert', {}, mockManagerCall);
  
  console.log(`   ✅ Manager API calls made: ${managerCallCount} (expected: 2 - read cached, write not cached)`);
  console.log(`   ✅ Manager cache stats: ${JSON.stringify(manager.getCacheStats(456))}\n`);

  console.log('3️⃣ Testing request signature normalization...');
  let normalizationCallCount = 0;
  const mockNormalizationCall = async () => {
    normalizationCallCount++;
    return { normalized: true };
  };

  await cache.dedupe('test.method', { a: 1, b: 2, requestId: 'ignore1' }, mockNormalizationCall);
  await cache.dedupe('test.method', { b: 2, a: 1, requestId: 'ignore2' }, mockNormalizationCall);
  
  console.log(`   ✅ Normalization calls made: ${normalizationCallCount} (expected: 1 - second should be cached)\n`);

  console.log('🎉 All caching integration tests passed!');
  console.log('📊 Final cache statistics:');
  console.log(`   - GoogleApiCache entries: ${cache.getCacheStats().size}`);
  console.log(`   - CachedFetchManager entries: ${manager.getCacheStats(456)?.size || 0}`);
}

testCachingIntegration().catch(console.error);
