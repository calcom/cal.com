import { createHmac } from "crypto";
import { compile } from "handlebars";

import type { TGetTranscriptAccessLink } from "@calcom/app-store/dailyvideo/zod";
import { getHumanReadableLocationValue } from "@calcom/app-store/locations";
import { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import { getUTCOffsetByTimezone } from "@calcom/lib/dayjs";
import { prisma } from "@calcom/prisma";
import type { Payment, Webhook } from "@calcom/prisma/client";
import type { CalendarEvent, Person } from "@calcom/types/Calendar";

type ContentType = "application/json" | "application/x-www-form-urlencoded";

export type EventTypeInfo = {
  eventTitle?: string | null;
  eventDescription?: string | null;
  requiresConfirmation?: boolean | null;
  price?: number | null;
  currency?: string | null;
  length?: number | null;
};

export type UTCOffset = {
  utcOffset?: number | null;
};

export type WithUTCOffsetType<T> = T & {
  user?: Person & UTCOffset;
} & {
  organizer?: Person & UTCOffset;
} & {
  attendees?: (Person & UTCOffset)[];
};

export type BookingNoShowUpdatedPayload = {
  message: string;
  bookingUid: string;
  bookingId?: number;
  attendees: { email: string; noShow: boolean }[];
};

export type TranscriptionGeneratedPayload = {
  downloadLinks?: {
    transcription: TGetTranscriptAccessLink["transcription"];
    recording: string;
  };
};

export type OOOEntryPayloadType = {
  oooEntry: {
    id: number;
    start: string;
    end: string;
    createdAt: string;
    updatedAt: string;
    notes: string | null;
    reason: {
      emoji?: string;
      reason?: string;
    };
    reasonId: number;
    user: {
      id: number;
      name: string | null;
      username: string | null;
      timeZone: string;
      email: string;
    };
    toUser: {
      id: number;
      name?: string | null;
      username?: string | null;
      timeZone?: string;
      email?: string;
    } | null;
    uuid: string;
  };
};

export type EventPayloadType = CalendarEvent &
  TranscriptionGeneratedPayload &
  EventTypeInfo & {
    uid?: string | null;
    metadata?: { [key: string]: string | number | boolean | null };
    bookingId?: number;
    status?: string;
    smsReminderNumber?: string;
    rescheduleId?: number;
    rescheduleUid?: string;
    rescheduleStartTime?: string;
    rescheduleEndTime?: string;
    downloadLink?: string;
    paymentId?: number;
    rescheduledBy?: string;
    cancelledBy?: string;
    paymentData?: Payment;
  };

export type WebhookPayloadType = EventPayloadType | OOOEntryPayloadType | BookingNoShowUpdatedPayload;

type WebhookDataType = WebhookPayloadType & { triggerEvent: string; createdAt: string };

function addUTCOffset(data: WebhookPayloadType): WithUTCOffsetType<WebhookPayloadType> {
  if (isEventPayload(data)) {
    if (data.organizer?.timeZone) {
      (data.organizer as Person & UTCOffset).utcOffset = getUTCOffsetByTimezone(
        data.organizer.timeZone,
        data.startTime
      );
    }

    if (data.attendees?.length) {
      (data.attendees as (Person & UTCOffset)[]).forEach((attendee) => {
        attendee.utcOffset = getUTCOffsetByTimezone(attendee.timeZone, data.startTime);
      });
    }
  }

  return data as WithUTCOffsetType<WebhookPayloadType>;
}

export type TrackingData = {
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_term?: string | null;
  utm_content?: string | null;
};

async function hydrateTracking(data: EventPayloadType): Promise<TrackingData | undefined> {
  const repo = new BookingRepository(prisma);
  if (data.bookingId) {
    const booking = await repo.findByIdIncludeTracking(data.bookingId);
    return (booking as unknown as { tracking?: TrackingData })?.tracking ?? undefined;
  }
  if (data.uid) {
    const booking = await repo.findByUidIncludeTracking(data.uid);
    return (booking as unknown as { tracking?: TrackingData })?.tracking ?? undefined;
  }
  return undefined;
}

function getZapierPayload(
  data: WithUTCOffsetType<EventPayloadType & { createdAt: string; tracking?: TrackingData }>
): string {
  const attendees = (data.attendees as (Person & UTCOffset)[]).map((attendee) => {
    return {
      name: attendee.name,
      email: attendee.email,
      timeZone: attendee.timeZone,
      utcOffset: attendee.utcOffset,
    };
  });

  const t = data.organizer.language.translate;
  const location = getHumanReadableLocationValue(data.location || "", t);

  const body = {
    uid: data.uid,
    title: data.title,
    description: data.description,
    customInputs: data.customInputs,
    responses: data.responses,
    userFieldsResponses: data.userFieldsResponses,
    startTime: data.startTime,
    endTime: data.endTime,
    location: location,
    status: data.status,
    cancellationReason: data.cancellationReason,
    user: {
      username: data.organizer.username,
      usernameInOrg: data.organizer.usernameInOrg,
      name: data.organizer.name,
      email: data.organizer.email,
      timeZone: data.organizer.timeZone,
      utcOffset: data.organizer.utcOffset,
      locale: data.organizer.locale,
    },
    eventType: {
      title: data.eventTitle,
      description: data.eventDescription,
      requiresConfirmation: data.requiresConfirmation,
      price: data.price,
      currency: data.currency,
      length: data.length,
    },
    attendees: attendees,
    createdAt: data.createdAt,
    metadata: {
      videoCallUrl: data.metadata?.videoCallUrl,
    },
    ...(data.tracking && {
      utm: {
        utm_source: data.tracking.utm_source,
        utm_medium: data.tracking.utm_medium,
        utm_campaign: data.tracking.utm_campaign,
        utm_term: data.tracking.utm_term,
        utm_content: data.tracking.utm_content,
      },
    }),
  };
  return JSON.stringify(body);
}

function applyTemplate(template: string, data: WebhookDataType, contentType: ContentType) {
  const compiled = compile(template)(data).replace(/&quot;/g, '"');

  if (contentType === "application/json") {
    return JSON.stringify(jsonParse(compiled));
  }
  return compiled;
}

export function jsonParse(jsonString: string) {
  try {
    return JSON.parse(jsonString);
  } catch {
    // don't do anything.
  }
  return false;
}

export function isOOOEntryPayload(data: WebhookPayloadType): data is OOOEntryPayloadType {
  return "oooEntry" in data;
}

export function isNoShowPayload(data: WebhookPayloadType): data is BookingNoShowUpdatedPayload {
  return "message" in data;
}

export function isEventPayload(data: WebhookPayloadType): data is EventPayloadType {
  return !isNoShowPayload(data) && !isOOOEntryPayload(data);
}

const sendPayload = async (
  secretKey: string | null,
  triggerEvent: string,
  createdAt: string,
  webhook: Pick<Webhook, "subscriberUrl" | "appId" | "payloadTemplate">,
  data: WebhookPayloadType
) => {
  const { appId, payloadTemplate: template } = webhook;

  const contentType =
    !template || jsonParse(template) ? "application/json" : "application/x-www-form-urlencoded";

  data = addUTCOffset(data);

  // Hydrate tracking data for all event payloads
  let tracking: TrackingData | undefined;
  if (isEventPayload(data)) {
    tracking = await hydrateTracking(data);
  }

  let body;
  /* Zapier id is hardcoded in the DB, we send the raw data for this case  */
  if (isEventPayload(data)) {
    data.description = data.description || data.additionalNotes;
    if (appId === "zapier") {
      body = getZapierPayload({ ...data, createdAt, tracking });
    }
  }

  if (body === undefined) {
    if (template && (isOOOEntryPayload(data) || isEventPayload(data) || isNoShowPayload(data))) {
      body = applyTemplate(
        template,
        { ...data, triggerEvent, createdAt, ...(tracking && { utm: tracking }) },
        contentType
      );
    } else {
      body = JSON.stringify({
        triggerEvent: triggerEvent,
        createdAt: createdAt,
        payload: data,
        ...(tracking && { utm: tracking }),
      });
    }
  }

  return _sendPayload(secretKey, webhook, body, contentType);
};

export const sendGenericWebhookPayload = async ({
  secretKey,
  triggerEvent,
  createdAt,
  webhook,
  data,
  rootData,
}: {
  secretKey: string | null;
  triggerEvent: string;
  createdAt: string;
  webhook: Pick<Webhook, "subscriberUrl" | "appId" | "payloadTemplate">;
  data: Record<string, unknown>;
  rootData?: Record<string, unknown>;
}) => {
  const body = JSON.stringify({
    // Added rootData props first so that using the known(i.e. triggerEvent, createdAt, payload) properties in rootData doesn't override the known properties
    ...rootData,
    triggerEvent: triggerEvent,
    createdAt: createdAt,
    payload: data,
  });

  return _sendPayload(secretKey, webhook, body, "application/json");
};

export const createWebhookSignature = (params: { secret?: string | null; body: string }) =>
  params.secret
    ? createHmac("sha256", params.secret).update(`${params.body}`).digest("hex")
    : "no-secret-provided";

const _sendPayload = async (
  secretKey: string | null,
  webhook: Pick<Webhook, "subscriberUrl" | "appId" | "payloadTemplate">,
  body: string,
  contentType: "application/json" | "application/x-www-form-urlencoded"
) => {
  const { subscriberUrl } = webhook;
  if (!subscriberUrl || !body) {
    throw new Error("Missing required elements to send webhook payload.");
  }

  const response = await fetch(subscriberUrl, {
    method: "POST",
    headers: {
      "Content-Type": contentType,
      "X-Cal-Signature-256": createWebhookSignature({ secret: secretKey, body }),
    },
    redirect: "manual",
    body,
  });

  const text = await response.text();

  return {
    ok: response.ok,
    status: response.status,
    ...(text
      ? {
          message: text,
        }
      : {}),
  };
};

export default sendPayload;
