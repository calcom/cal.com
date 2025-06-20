const { GoogleApiCache } = require("./GoogleApiCache");

async function testCaching() {
  console.log("Testing Google API Cache...");

  const cache = new GoogleApiCache(123, { cacheWindowMs: 5000 });

  let callCount = 0;
  const mockApiCall = async () => {
    callCount++;
    console.log(`API call #${callCount}`);
    return { data: `response-${callCount}`, timestamp: Date.now() };
  };

  console.log("\n1. Making first call...");
  const result1 = await cache.dedupe("calendar.events.list", { calendarId: "primary" }, mockApiCall);
  console.log("Result 1:", result1);

  console.log("\n2. Making identical call (should be cached)...");
  const result2 = await cache.dedupe("calendar.events.list", { calendarId: "primary" }, mockApiCall);
  console.log("Result 2:", result2);

  console.log("\n3. Making different call...");
  const result3 = await cache.dedupe("calendar.events.list", { calendarId: "secondary" }, mockApiCall);
  console.log("Result 3:", result3);

  console.log("\n4. Making call with different method...");
  const result4 = await cache.dedupe("calendar.freebusy.query", { calendarId: "primary" }, mockApiCall);
  console.log("Result 4:", result4);

  console.log(`\nTotal API calls made: ${callCount} (should be 3)`);
  console.log("Cache stats:", cache.getCacheStats());

  console.log("\n5. Waiting for cache to expire...");
  await new Promise((resolve) => setTimeout(resolve, 6000));

  console.log("6. Making expired call (should hit API again)...");
  const result5 = await cache.dedupe("calendar.events.list", { calendarId: "primary" }, mockApiCall);
  console.log("Result 5:", result5);

  console.log(`\nFinal API calls made: ${callCount} (should be 4)`);
  console.log("Final cache stats:", cache.getCacheStats());
}

testCaching().catch(console.error);
