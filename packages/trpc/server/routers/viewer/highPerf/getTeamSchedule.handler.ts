import type { IncomingMessage } from "http";
import crypto from "crypto";

import { RedisService } from "@calcom/features/redis/RedisService";

import { getAvailableSlots } from "../slots/util";
import type { TGetTeamScheduleInputSchema } from "./getTeamSchedule.schema";

export type GetTeamScheduleOptions = {
  ctx?: ContextForGetSchedule;
  input: TGetTeamScheduleInputSchema;
};

interface ContextForGetSchedule extends Record<string, unknown> {
  req?: (IncomingMessage & { cookies: Partial<{ [key: string]: string }> }) | undefined;
}

const CACHE_TTL = 300; // 5 minutes cache TTL

function buildCacheKey(input: TGetTeamScheduleInputSchema): string {
  // Create a stable cache key from input, excluding allowStale
  const { allowStale, ...cacheableInput } = input;
  
  // Sort object keys to ensure stable key generation
  const sortedInput = Object.keys(cacheableInput)
    .sort()
    .reduce((acc, key) => {
      const value = cacheableInput[key as keyof typeof cacheableInput];
      if (value !== undefined && value !== null) {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, any>);
  
  // Create a hash of the input for a shorter, stable key
  const inputHash = crypto
    .createHash('sha256')
    .update(JSON.stringify(sortedInput))
    .digest('hex')
    .substring(0, 16);
  
  return `team-schedule:${inputHash}`;
}

export const getTeamScheduleHandler = async ({ ctx, input }: GetTeamScheduleOptions) => {
  console.log("getTeamScheduleHandler called with input:", JSON.stringify(input, null, 2));
  
  let redisService: RedisService | null = null;
  
  try {
    // Try to initialize RedisService
    redisService = new RedisService();
    console.log("RedisService initialized successfully");
  } catch (error) {
    // RedisService not configured, proceed without caching
    console.debug("RedisService not configured, proceeding without cache", error);
  }
  
  // If RedisService is available and allowStale is true, try to serve from cache
  if (redisService && input.allowStale) {
    console.log("Attempting to serve from cache (allowStale=true)");
    try {
      const cacheKey = buildCacheKey(input);
      console.log(`Looking for cached result with key: ${cacheKey}`);
      const cachedResult = await redisService.get<any>(cacheKey);
      
      if (cachedResult) {
        console.log(`Serving team schedule from cache for key: ${cacheKey}`, {
          resultKeys: Object.keys(cachedResult),
          inputJson: JSON.stringify(input, null, 2)
        });
        return { ...cachedResult, FROM_CACHE: true };
      } else {
        console.log(`No cached result found for key: ${cacheKey}`);
      }
    } catch (error) {
      console.error("Error reading from cache:", error, {
        inputJson: JSON.stringify(input, null, 2)
      });
      // Continue to fetch fresh data if cache read fails
    }
  } else {
    console.log("Skipping cache lookup", {
      hasRedisService: !!redisService,
      allowStale: input.allowStale,
      inputJson: JSON.stringify(input, null, 2)
    });
  }
  
  // Fetch fresh data
  console.log("Fetching fresh data from getAvailableSlots", {
    inputJson: JSON.stringify(input, null, 2)
  });
  const result = await getAvailableSlots({ ctx, input });
  console.log("Fresh data fetched successfully", {
    resultKeys: Object.keys(result),
    inputJson: JSON.stringify(input, null, 2)
  });
  
  // Store in cache if RedisService is available
  if (redisService) {
    console.log("Attempting to cache result");
    try {
      const cacheKey = buildCacheKey(input);
      await redisService.set(cacheKey, result);
      await redisService.expire(cacheKey, CACHE_TTL);
      console.log(`Cached team schedule with key: ${cacheKey}`, {
        ttl: CACHE_TTL,
        inputJson: JSON.stringify(input, null, 2)
      });
    } catch (error) {
      console.error("Error writing to cache:", error, {
        inputJson: JSON.stringify(input, null, 2)
      });
      // Non-critical error, continue without caching
    }
  } else {
    console.log("Skipping cache storage (no RedisService)", {
      inputJson: JSON.stringify(input, null, 2)
    });
  }
  
  return result;
};
