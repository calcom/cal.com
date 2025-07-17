import { getAvailableSlotsService } from "@calcom/lib/di/containers/available-slots";

import type { GetScheduleOptions } from "./types";

type GetAvailableSlotsReturn = Awaited<
  ReturnType<ReturnType<typeof getAvailableSlotsService>["getAvailableSlots"]>
>;

type CacheEntry<T> = {
  ts: number;
  data: T;
};

const cache = new Map<string, CacheEntry<GetAvailableSlotsReturn>>();
const TTL_MS = 1000; // 1 second
const CLEANUP_INTERVAL = 10000; // Clean every 10 seconds
let lastCleanup = Date.now();

export const getScheduleHandler = async ({
  ctx,
  input,
}: GetScheduleOptions): Promise<GetAvailableSlotsReturn> => {
  const now = Date.now();
  const key = `${Math.floor(now / 1000)}::${JSON.stringify(input)}`;
  const cached = cache.get(key);

  if (cached && now - cached.ts < TTL_MS) return cached.data;

  const availableSlotsService = getAvailableSlotsService();
  const result = await availableSlotsService.getAvailableSlots({ ctx, input });

  if (cache.size < 9000) {
    cache.set(key, { ts: now, data: result });
  } else {
    console.log(`Cache grew too large (${cache.size}), skipping cache set.`);
  }

  // Periodically sweep old cache entries
  if (now - lastCleanup > CLEANUP_INTERVAL) {
    lastCleanup = now;
    setTimeout(() => {
      const now = Date.now();
      cache.forEach((entry, key) => {
        if (now - entry.ts > TTL_MS) {
          cache.delete(key);
        }
      });
    }, 0); // defer to not impact current request
  }

  return result;
};
