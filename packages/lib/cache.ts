import crypto from "crypto";

import { VercelKVService } from "@calcom/features/redis/VercelKVService";
import type { TGetScheduleInputSchema } from "@calcom/trpc/server/routers/viewer/slots/types";
import type { IGetAvailableSlots } from "@calcom/trpc/server/routers/viewer/slots/util";

const CACHE_TTL_SECONDS = 10;
const CACHE_KEY_PREFIX = "schedule:";

export function createScheduleCacheKey(input: TGetScheduleInputSchema): string {
  const normalizedInput = {
    startTime: input.startTime,
    endTime: input.endTime,
    eventTypeId: input.eventTypeId,
    eventTypeSlug: input.eventTypeSlug,
    timeZone: input.timeZone,
    usernameList: input.usernameList?.sort(),
    duration: input.duration,
    rescheduleUid: input.rescheduleUid,
    isTeamEvent: input.isTeamEvent,
    orgSlug: input.orgSlug,
    teamMemberEmail: input.teamMemberEmail,
    routedTeamMemberIds: input.routedTeamMemberIds?.sort(),
    skipContactOwner: input.skipContactOwner,
    routingFormResponseId: input.routingFormResponseId,
    queuedFormResponseId: input.queuedFormResponseId,
    email: input.email,
  };

  const hash = crypto.createHash("sha1").update(JSON.stringify(normalizedInput)).digest("hex");
  return `${CACHE_KEY_PREFIX}${hash}`;
}

export async function getCachedSchedule(cacheKey: string): Promise<IGetAvailableSlots | null> {
  try {
    const kv = new VercelKVService();
    return await kv.get<IGetAvailableSlots>(cacheKey);
  } catch (error) {
    console.error("Error getting cached schedule:", error);
    return null;
  }
}

export async function setCachedSchedule(cacheKey: string, data: IGetAvailableSlots): Promise<void> {
  try {
    const kv = new VercelKVService();
    await kv.set(cacheKey, data);
    await kv.expire(cacheKey, CACHE_TTL_SECONDS);
  } catch (error) {
    console.error("Error setting cached schedule:", error);
  }
}

export interface InvalidateScheduleCacheParams {
  userId?: number | null;
  eventTypeId?: number | null;
  teamId?: number | null;
  orgSlug?: string;
}

export async function invalidateScheduleCache(params: InvalidateScheduleCacheParams): Promise<void> {
  try {
    const kv = new VercelKVService();

    const pattern = `${CACHE_KEY_PREFIX}*`;

    console.log("Cache invalidation requested for:", params);
  } catch (error) {
    console.error("Error invalidating schedule cache:", error);
  }
}

export function getUserScheduleCacheTrackingKey(userId: number): string {
  return `user:${userId}:schedule_keys`;
}

export function getEventTypeScheduleCacheTrackingKey(eventTypeId: number): string {
  return `eventtype:${eventTypeId}:schedule_keys`;
}

export function getTeamScheduleCacheTrackingKey(teamId: number): string {
  return `team:${teamId}:schedule_keys`;
}

export async function setCachedScheduleWithTracking(
  cacheKey: string,
  data: IGetAvailableSlots,
  input: TGetScheduleInputSchema
): Promise<void> {
  try {
    const kv = new VercelKVService();

    await kv.set(cacheKey, data);
    await kv.expire(cacheKey, CACHE_TTL_SECONDS);

    const trackingKeys: string[] = [];

    if (input.eventTypeId) {
      trackingKeys.push(getEventTypeScheduleCacheTrackingKey(input.eventTypeId));
    }

    for (const trackingKey of trackingKeys) {
      await kv.lpush(trackingKey, cacheKey);
      await kv.expire(trackingKey, CACHE_TTL_SECONDS);
    }
  } catch (error) {
    console.error("Error setting cached schedule with tracking:", error);
  }
}
