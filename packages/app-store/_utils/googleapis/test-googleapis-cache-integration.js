const { GoogleApiCacheFactory } = require("@calcom/app-store/_utils/googleapis");

async function testCacheIntegration() {
  console.log("Testing googleapis cache integration...");

  try {
    const edgeCacheManager = GoogleApiCacheFactory.createEdgeCacheManager();
    console.log("✓ Edge cache manager created");

    const redisCacheManager = GoogleApiCacheFactory.createRedisCacheManager();
    console.log("✓ Redis cache manager created");

    const mockFetch = () => Promise.resolve({ data: "test-data", timestamp: Date.now() });

    const result1 = await edgeCacheManager.cachedFetch(
      123,
      "events.list",
      { calendarId: "primary" },
      mockFetch
    );
    const result2 = await edgeCacheManager.cachedFetch(
      123,
      "events.list",
      { calendarId: "primary" },
      mockFetch
    );

    console.log("✓ Cache operations completed");

    const stats = edgeCacheManager.getCacheStats(123);
    console.log("✓ Cache stats:", stats);

    edgeCacheManager.clearCache(123);
    console.log("✓ Cache cleared");

    console.log("Integration test completed successfully!");
    return true;
  } catch (error) {
    console.error("Integration test failed:", error);
    return false;
  }
}

if (require.main === module) {
  testCacheIntegration().then((success) => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { testCacheIntegration };
