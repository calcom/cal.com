import { buildJobId, JobName } from "@calid/job-dispatcher";
import type { CalendarProvider, DeltaSyncWebhookJobData } from "@calid/job-engine";
import { QueueName } from "@calid/queue";

import dispatcher from "@lib/job-disptacher";

import { DELTA_SYNC_COALESCE_WINDOW_MS } from "./constants";

const toProviderSlug = (provider: CalendarProvider): "google" | "outlook" => {
  return provider === "GOOGLE" ? "google" : "outlook";
};

export const enqueueDeltaSyncFromWebhook = async (input: {
  calendarId: number;
  provider: CalendarProvider;
  credentialId: number;
  providerCalendarId: string;
  receivedAt: string;
  subscriptionId?: string | null;
  resourceId?: string | null;
}) => {
  const now = Date.now();
  const receivedAtMs = Date.parse(input.receivedAt);
  const anchorMs = Number.isFinite(receivedAtMs) ? receivedAtMs : now;
  const bucketStartMs = Math.floor(anchorMs / DELTA_SYNC_COALESCE_WINDOW_MS) * DELTA_SYNC_COALESCE_WINDOW_MS;
  const bucketRunAtMs = bucketStartMs + DELTA_SYNC_COALESCE_WINDOW_MS;
  const delayMs = Math.max(0, bucketRunAtMs - now);

  const payload: DeltaSyncWebhookJobData = {
    name: JobName.CALENDAR_SYNC,
    action: "deltaSync",
    calendarId: input.calendarId,
    reason: "webhook",
    provider: toProviderSlug(input.provider),
    credentialId: input.credentialId,
    providerCalendarId: input.providerCalendarId,
    receivedAt: input.receivedAt,
    subscriptionId: input.subscriptionId ?? null,
    resourceId: input.resourceId ?? null,
  };

  return await dispatcher.dispatch({
    queue: QueueName.DATA_SYNC,
    name: JobName.CALENDAR_SYNC,
    data: payload,
    bullmqOptions: {
      jobId: buildJobId(["calendarSync", "deltaSync", input.calendarId, bucketStartMs]),
      delay: delayMs,
      removeOnComplete: {
        age: 3600,
        count: 1000,
      },
      removeOnFail: {
        age: 86400,
        count: 2000,
      },
      attempts: 5,
      backoff: {
        type: "exponential",
        delay: 3_000,
      },
    },
  });
};
