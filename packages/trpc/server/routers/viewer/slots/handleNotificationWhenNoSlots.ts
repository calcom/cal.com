import { Redis } from "@upstash/redis";

import type { Dayjs } from "@calcom/dayjs";

type EventDetails = {
  username: string;
  eventSlug: string;
  startTime: Dayjs;
  visitorTimezone?: string;
  visitorUid?: string;
};

// TODO: Build this key based on startTime so we can get a period of time this happens
const constructRedisKey = (eventDetails: EventDetails) => {
  return `${eventDetails.username}:${eventDetails.eventSlug}`;
};

const constructDataHash = (eventDetails: EventDetails) => {
  const obj = {
    startTime: eventDetails.startTime.format("YYYY-MM-DD"),
    visitorTimezone: eventDetails?.visitorTimezone,
    visitorUid: eventDetails?.visitorUid,
  };

  return JSON.stringify(obj);
};

// 7 days
const NO_SLOTS_NOTIFICATION_FREQUENCY = 604_800;

const NO_SLOTS_COUNT_FOR_NOTIFICATION = 2;

export const handleNotificationWhenNoSlots = async ({
  eventDetails,
  orgDetails,
}: {
  eventDetails: EventDetails;
  orgDetails: { currentOrgDomain: string | null; isValidOrgDomain: boolean };
}) => {
  // if (!orgDetails.currentOrgDomain) return;
  const UPSTASH_ENV_FOUND = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!UPSTASH_ENV_FOUND) return;

  const redis = Redis.fromEnv();

  const usersUniqueKey = constructRedisKey(eventDetails);
  // Get only the required amount of data so the request is as small as possible
  const usersExistingNoSlots = await redis.lrange(usersUniqueKey, 0, NO_SLOTS_COUNT_FOR_NOTIFICATION - 1);
  await redis.lpush(usersUniqueKey, constructDataHash(eventDetails));

  if (!usersExistingNoSlots.length) {
    await redis.expire(usersUniqueKey, NO_SLOTS_NOTIFICATION_FREQUENCY);
  }

  // We add one as we know we just added one to the list - saves us re-fetching the data
  if (usersExistingNoSlots.length + 1 === NO_SLOTS_COUNT_FOR_NOTIFICATION) {
    //   Send Email
  }
};
