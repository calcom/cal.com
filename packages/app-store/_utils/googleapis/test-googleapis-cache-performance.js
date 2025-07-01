const { GoogleApiCacheFactory } = require("@calcom/app-store/_utils/googleapis");

async function performanceTest() {
  console.log("Running performance tests...");

  const cacheManager = GoogleApiCacheFactory.createEdgeCacheManager();
  const credentialId = 123;

  const mockApiCall = (delay = 100) => {
    return () =>
      new Promise((resolve) => {
        setTimeout(() => resolve({ data: `response-${Date.now()}` }), delay);
      });
  };

  console.log("Testing cache hit performance...");

  const params = { calendarId: "primary", timeMin: "2023-01-01T00:00:00Z" };

  const start1 = Date.now();
  await cacheManager.cachedFetch(credentialId, "events.list", params, mockApiCall(100));
  const time1 = Date.now() - start1;
  console.log(`Cache miss time: ${time1}ms`);

  const start2 = Date.now();
  await cacheManager.cachedFetch(credentialId, "events.list", params, mockApiCall(100));
  const time2 = Date.now() - start2;
  console.log(`Cache hit time: ${time2}ms`);

  const speedup = time1 / time2;
  console.log(`Cache speedup: ${speedup.toFixed(2)}x`);

  console.log("Testing concurrent request deduplication...");

  const concurrentRequests = Array(10)
    .fill()
    .map(() => cacheManager.cachedFetch(credentialId, "events.list", params, mockApiCall(50)));

  const startConcurrent = Date.now();
  await Promise.all(concurrentRequests);
  const concurrentTime = Date.now() - startConcurrent;

  console.log(`10 concurrent requests completed in: ${concurrentTime}ms`);

  const stats = cacheManager.getCacheStats(credentialId);
  console.log(`Cache entries: ${stats.size}`);

  console.log("Performance tests completed successfully!");
}

if (require.main === module) {
  performanceTest().catch(console.error);
}

module.exports = { performanceTest };
