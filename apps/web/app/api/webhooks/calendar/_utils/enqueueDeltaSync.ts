import { JobName } from "@calid/job-dispatcher";
import type { CalendarProvider, DeltaSyncWebhookJobData } from "@calid/job-engine";
import { QueueName } from "@calid/queue";

import dispatcher from "@lib/job-disptacher";

const toProviderSlug = (provider: CalendarProvider): "google" | "outlook" => {
  return provider === "GOOGLE" ? "google" : "outlook";
};

export const enqueueDeltaSyncFromWebhook = async (input: {
  calendarId: number;
  provider: CalendarProvider;
  receivedAt: string;
  subscriptionId?: string | null;
  resourceId?: string | null;
}) => {
  const payload: DeltaSyncWebhookJobData = {
    name: JobName.CALENDAR_SYNC,
    action: "deltaSync",
    calendarId: input.calendarId,
    reason: "webhook",
    provider: toProviderSlug(input.provider),
    receivedAt: input.receivedAt,
    subscriptionId: input.subscriptionId ?? null,
    resourceId: input.resourceId ?? null,
  };

  return await dispatcher.dispatch({
    queue: QueueName.DATA_SYNC,
    name: JobName.CALENDAR_SYNC,
    data: payload,
    bullmqOptions: {
      jobId: `deltaSync:${input.calendarId}`,
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
