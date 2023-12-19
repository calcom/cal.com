import type { Webhook } from "@prisma/client";
import { createHmac } from "crypto";
import { compile } from "handlebars";

import { getHumanReadableLocationValue } from "@calcom/app-store/locations";
import type { CalendarEvent } from "@calcom/types/Calendar";

type ContentType = "application/json" | "application/x-www-form-urlencoded";

export type EventTypeInfo = {
  eventTitle?: string | null;
  eventDescription?: string | null;
  requiresConfirmation?: boolean | null;
  price?: number | null;
  currency?: string | null;
  length?: number | null;
};

export type WebhookDataType = CalendarEvent &
  EventTypeInfo & {
    metadata?: { [key: string]: string | number | boolean | null };
    bookingId?: number;
    status?: string;
    smsReminderNumber?: string;
    rescheduleId?: number;
    rescheduleUid?: string;
    rescheduleStartTime?: string;
    rescheduleEndTime?: string;
    triggerEvent: string;
    createdAt: string;
    downloadLink?: string;
    paymentId?: number;
  };

function getZapierPayload(
  data: CalendarEvent & EventTypeInfo & { status?: string; createdAt: string }
): string {
  const attendees = data.attendees.map((attendee) => {
    return {
      name: attendee.name,
      email: attendee.email,
      timeZone: attendee.timeZone,
    };
  });

  const t = data.organizer.language.translate;
  const location = getHumanReadableLocationValue(data.location || "", t);

  const body = {
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
      name: data.organizer.name,
      email: data.organizer.email,
      timeZone: data.organizer.timeZone,
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
  } catch (e) {
    // don't do anything.
  }
  return false;
}

const sendPayload = async (
  secretKey: string | null,
  triggerEvent: string,
  createdAt: string,
  webhook: Pick<Webhook, "subscriberUrl" | "appId" | "payloadTemplate">,
  data: Omit<WebhookDataType, "createdAt" | "triggerEvent">
) => {
  const { appId, payloadTemplate: template } = webhook;

  const contentType =
    !template || jsonParse(template) ? "application/json" : "application/x-www-form-urlencoded";

  data.description = data.description || data.additionalNotes;
  let body;

  /* Zapier id is hardcoded in the DB, we send the raw data for this case  */
  if (appId === "zapier") {
    body = getZapierPayload({ ...data, createdAt });
  } else if (template) {
    body = applyTemplate(template, { ...data, triggerEvent, createdAt }, contentType);
  } else {
    body = JSON.stringify({
      triggerEvent: triggerEvent,
      createdAt: createdAt,
      payload: data,
    });
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

  const secretSignature = secretKey
    ? createHmac("sha256", secretKey).update(`${body}`).digest("hex")
    : "no-secret-provided";

  const response = await fetch(subscriberUrl, {
    method: "POST",
    headers: {
      "Content-Type": contentType,
      "X-Cal-Signature-256": secretSignature,
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
