import { v4 } from "uuid";


import { DailyLocationType, getHumanReadableLocationValue } from "@calcom/app-store/locations";
import { selectOOOEntries } from "@calcom/app-store/zapier/api/subscriptions/listOOOEntries";
import dayjs from "@calcom/dayjs";
import { getCalEventResponses } from "@calcom/features/bookings/lib/getCalEventResponses";
import tasker from "@calcom/features/tasker";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { withReporting } from "@calcom/lib/sentryWrapper";
import { getTranslation } from "@calcom/lib/server/i18n";
import { prisma } from "@calcom/prisma";
import type { Prisma, Webhook, Booking, ApiKey } from "@calcom/prisma/client";
import { BookingStatus, WebhookTriggerEvents } from "@calcom/prisma/enums";
import { bookingMetadataSchema } from "@calcom/prisma/zod-utils";
import { DEFAULT_WEBHOOK_VERSION, type WebhookVersion } from "./interface/IWebhookRepository";


const SCHEDULING_TRIGGER: WebhookTriggerEvents[] = [
  WebhookTriggerEvents.MEETING_ENDED,
  WebhookTriggerEvents.MEETING_STARTED,
];


const NO_SHOW_TRIGGERS: WebhookTriggerEvents[] = [
  WebhookTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW,
  WebhookTriggerEvents.AFTER_GUESTS_CAL_VIDEO_NO_SHOW,
  WebhookTriggerEvents.BOOKING_NO_SHOW_UPDATED,
];


const log = logger.getSubLogger({ prefix: ["[node-scheduler]"] });


export async function addSubscription({
  appApiKey,
  triggerEvent,
  subscriberUrl,
  appId,
  account,
}: {
