import { PrismaClient } from "@prisma/client";
import { OutlookCacheService } from "../lib/CacheService";
import { OutlookSubscriptionService } from "../lib/SubscriptionService";

const prisma = new PrismaClient();
const cacheService = new OutlookCacheService();
const subscriptionService = new OutlookSubscriptionService();

async function monitorCache() {
  console.log("Starting cache monitoring...");

  // Monitor cache statistics
  const cacheStats = await prisma.calendarAvailabilityCache.groupBy({
    by: ["userId"],
    _count: {
      id: true,
    },
    _max: {
      lastUpdated: true,
    },
  });

  console.log("\nCache Statistics:");
  console.log("----------------");
  for (const stat of cacheStats) {
    console.log(`User ${stat.userId}:`);
    console.log(`  Total cache entries: ${stat._count.id}`);
    console.log(`  Last updated: ${stat._max.lastUpdated}`);
  }

  // Monitor stale cache entries
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const staleEntries = await prisma.calendarAvailabilityCache.findMany({
    where: {
      lastUpdated: {
        lt: oneHourAgo,
      },
    },
    select: {
      userId: true,
      calendarId: true,
      date: true,
      lastUpdated: true,
    },
  });

  console.log("\nStale Cache Entries:");
  console.log("-------------------");
  for (const entry of staleEntries) {
    console.log(`User ${entry.userId}, Calendar ${entry.calendarId}:`);
    console.log(`  Date: ${entry.date}`);
    console.log(`  Last updated: ${entry.lastUpdated}`);
  }

  // Monitor subscription health
  const subscriptions = await prisma.calendarAvailabilityCache.findMany({
    where: {
      subscriptionId: {
        not: null,
      },
    },
    select: {
      userId: true,
      calendarId: true,
      subscriptionId: true,
    },
    distinct: ["userId", "calendarId"],
  });

  console.log("\nSubscription Health:");
  console.log("------------------");
  for (const sub of subscriptions) {
    console.log(`User ${sub.userId}, Calendar ${sub.calendarId}:`);
    console.log(`  Subscription ID: ${sub.subscriptionId}`);
  }

  // Monitor cache hit/miss rates (requires logging implementation)
  console.log("\nCache Performance:");
  console.log("----------------");
  console.log("Note: Implement logging to track cache hit/miss rates");

  // Monitor API call frequency (requires logging implementation)
  console.log("\nAPI Call Frequency:");
  console.log("-----------------");
  console.log("Note: Implement logging to track API call frequency");

  // Clean up
  await prisma.$disconnect();
}

// Run monitoring
monitorCache().catch((error) => {
  console.error("Error monitoring cache:", error);
  process.exit(1);
}); 