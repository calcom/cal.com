import { prisma } from "@calcom/prisma";
import { TRPCError } from "@trpc/server";
import { createHash } from "crypto";
import { z } from "zod";
import { CalendarEvent, IntegrationCalendar } from "@calcom/types/Calendar";
import { CredentialPayload } from "@calcom/types/Credential";
import { Dayjs } from "dayjs";
import { redis } from "@calcom/lib/redis";

// Cache TTL in seconds (30 days)
const CACHE_TTL = 30 * 24 * 60 * 60;

// Schema for cached calendar events
const cachedCalendarEventSchema = z.object({
  id: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  title: z.string().optional(),
  attendees: z.array(z.any()).optional(),
  location: z.string().optional(),
  organizer: z.any().optional(),
  uid: z.string().optional(),
  calendarId: z.string(),
  credentialId: z.number(),
  userId: z.number(),
  updatedAt: z.string(),
});

type CachedCalendarEvent = z.infer<typeof cachedCalendarEventSchema>;

// Generate a cache key for a user's calendar availability
export const getUserCalendarCacheKey = (
  userId: number,
  credentialId: number,
  calendarId: string,
  startDate: string,
  endDate: string
) => {
  return `calendar:${userId}:${credentialId}:${calendarId}:${startDate}:${endDate}`;
};

// Generate a cache key for a team's availability
export const getTeamCalendarCacheKey = (
  teamId: number,
  startDate: string,
  endDate: string
) => {
  return `team:${teamId}:availability:${startDate}:${endDate}`;
};

// Generate a cache key for a subscription
export const getSubscriptionCacheKey = (
  userId: number,
  credentialId: number,
  calendarId: string
) => {
  return `subscription:${userId}:${credentialId}:${calendarId}`;
};

// Store calendar events in cache
export const cacheCalendarEvents = async (
  userId: number,
  credentialId: number,
  calendarId: string,
  startDate: string,
  endDate: string,
  events: CalendarEvent[]
) => {
  try {
    const cacheKey = getUserCalendarCacheKey(userId, credentialId, calendarId, startDate, endDate);
    const cachedEvents = events.map((event) => ({
      ...event,
      credentialId,
      userId,
      calendarId,
      updatedAt: new Date().toISOString(),
    }));
    await redis.set(cacheKey, JSON.stringify(cachedEvents), "EX", CACHE_TTL);
    return true;
  } catch (error) {
    console.error("Failed to cache calendar events:", error);
    return false;
  }
};

// Get cached calendar events
export const getCachedCalendarEvents = async (
  userId: number,
  credentialId: number,
  calendarId: string,
  startDate: string,
  endDate: string
): Promise<CalendarEvent[] | null> => {
  try {
    const cacheKey = getUserCalendarCacheKey(userId, credentialId, calendarId, startDate, endDate);
    const cachedData = await redis.get(cacheKey);
    if (!cachedData) return null;
    const parsedData = JSON.parse(cachedData);
    const events = z.array(cachedCalendarEventSchema).parse(parsedData);
    return events as CalendarEvent[];
  } catch (error) {
    console.error("Failed to get cached calendar events:", error);
    return null;
  }
};

// Update cached calendar events when a notification is received
export const updateCachedCalendarEvent = async (
  userId: number,
  credentialId: number,
  calendarId: string,
  event: CalendarEvent,
  changeType: "created" | "updated" | "deleted"
) => {
  try {
    // Find all cache keys for this user and calendar
    const pattern = `calendar:${userId}:${credentialId}:${calendarId}:*`;
    const keys = await redis.keys(pattern);
    for (const key of keys) {
      const cachedData = await redis.get(key);
      if (!cachedData) continue;
      let events = JSON.parse(cachedData) as CachedCalendarEvent[];
      if (changeType === "deleted") {
        // Remove the event from cache
        events = events.filter((e) => e.id !== event.id);
      } else {
        // Add or update the event
        const eventIndex = events.findIndex((e) => e.id === event.id);
        const updatedEvent = {
          ...event,
          credentialId,
          userId,
          calendarId,
          updatedAt: new Date().toISOString(),
        };
        if (eventIndex >= 0) {
          events[eventIndex] = updatedEvent as CachedCalendarEvent;
        } else {
          events.push(updatedEvent as CachedCalendarEvent);
        }
      }
      // Update the cache
      await redis.set(key, JSON.stringify(events), "EX", CACHE_TTL);
    }
    // Invalidate team caches that include this user
    const userTeams = await prisma.membership.findMany({
      where: { userId },
      select: { teamId: true },
    });
    for (const { teamId } of userTeams) {
      const teamPattern = `team:${teamId}:availability:*`;
      const teamKeys = await redis.keys(teamPattern);
      for (const teamKey of teamKeys) {
        await redis.del(teamKey);
      }
    }
    return true;
  } catch (error) {
    console.error("Failed to update cached calendar event:", error);
    return false;
  }
};

// Store subscription information
export const cacheSubscription = async (
  userId: number,
  credentialId: number,
  calendarId: string,
  subscriptionId: string,
  expirationDateTime: string
) => {
  try {
    const cacheKey = getSubscriptionCacheKey(userId, credentialId, calendarId);
    await redis.set(
      cacheKey,
      JSON.stringify({ subscriptionId, expirationDateTime }),
      "EX",
      CACHE_TTL
    );
    return true;
  } catch (error) {
    console.error("Failed to cache subscription:", error);
    return false;
  }
};

// Get cached subscription
export const getCachedSubscription = async (
  userId: number,
  credentialId: number,
  calendarId: string
) => {
  try {
    const cacheKey = getSubscriptionCacheKey(userId, credentialId, calendarId);
    const cachedData = await redis.get(cacheKey);
    if (!cachedData) return null;
    return JSON.parse(cachedData) as { subscriptionId: string; expirationDateTime: string };
  } catch (error) {
    console.error("Failed to get cached subscription:", error);
    return null;
  }
};

// Delete cached subscription
export const deleteCachedSubscription = async (
  userId: number,
  credentialId: number,
  calendarId: string
) => {
  try {
    const cacheKey = getSubscriptionCacheKey(userId, credentialId, calendarId);
    await redis.del(cacheKey);
    return true;
  } catch (error) {
    console.error("Failed to delete cached subscription:", error);
    return false;
  }
};

// Invalidate all caches for a user
export const invalidateUserCache = async (userId: number) => {
  try {
    const pattern = `calendar:${userId}:*`;
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
    return true;
  } catch (error) {
    console.error("Failed to invalidate user cache:", error);
    return false;
  }
};
