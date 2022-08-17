import { Webhook } from "@prisma/client";
import { createHmac } from "crypto";
import { compile } from "handlebars";

import { ZapierResponseBodyType } from "@calcom/app-store/zapier/api/subscriptions/listBookings";
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

function getZapierPayload(data: CalendarEvent & EventTypeInfo & { status?: string }): string {
  const attendees = data.attendees.map((attendee) => {
    return {
      name: attendee.name,
      email: attendee.email,
      timeZone: attendee.timeZone,
    };
  });

  let location = data.location;

  switch (data.location) {
    case "integrations:google:meet":
      location = "Google Meet";
      break;
    case "integrations:daily":
      location = "Cal Video";
      break;
    case "integrations:zoom":
      location = "Zoom";
      break;
    case "integrations:huddle01":
      location = "Huddle01";
      break;
    case "integrations:tandem":
      location = "Tandem";
      break;
    case "integrations:office365_video":
      location = "MS Teams";
      break;
    case "integrations:jitsi":
      location = "Jitsi";
      break;
    case "integrations:whereby_video":
      location = "Whereby";
      break;
    case "integrations:around_video":
      location = "Around";
      break;
    case "integrations:riverside_video":
      location = "Riverside";
      break;
  }

  const body: ZapierResponseBodyType = {
    title: data.title,
    description: data.description || null,
    customInputs: data.customInputs || null,
    startTime: data.startTime,
    endTime: data.endTime,
    location: location || null,
    status: data.status || null,
    eventType: {
      title: data.eventTitle || null,
      description: data.eventDescription || null,
      requiresConfirmation: data.requiresConfirmation || null,
      price: data.price || null,
      currency: data.currency || null,
      length: data.length || null,
    },
    attendees: attendees,
  };
  return JSON.stringify(body);
}

function applyTemplate(template: string, data: CalendarEvent, contentType: ContentType) {
  const compiled = compile(template)(data);
  if (contentType === "application/json") {
    return JSON.stringify(jsonParse(compiled));
  }
  return compiled;
}

function jsonParse(jsonString: string) {
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
  data: CalendarEvent &
    EventTypeInfo & {
      metadata?: { [key: string]: string };
      rescheduleUid?: string;
      bookingId?: number;
      status?: string;
    }
) => {
  const { appId, payloadTemplate: template } = webhook;

  const contentType =
    !template || jsonParse(template) ? "application/json" : "application/x-www-form-urlencoded";

  data.description = data.description || data.additionalNotes;

  let body;

  /* Zapier id is hardcoded in the DB, we send the raw data for this case  */
  if (appId === "zapier") {
    body = getZapierPayload(data);
  } else if (template) {
    body = applyTemplate(template, data, contentType);
  } else {
    body = JSON.stringify({
      triggerEvent: triggerEvent,
      createdAt: createdAt,
      payload: data,
    });
  }

  return _sendPayload(secretKey, triggerEvent, createdAt, webhook, body, contentType);
};

export const sendGenericWebhookPayload = async (
  secretKey: string | null,
  triggerEvent: string,
  createdAt: string,
  webhook: Pick<Webhook, "subscriberUrl" | "appId" | "payloadTemplate">,
  data: Record<string, unknown>
) => {
  const body = JSON.stringify(data);
  return _sendPayload(secretKey, triggerEvent, createdAt, webhook, body, "application/json");
};

const _sendPayload = async (
  secretKey: string | null,
  triggerEvent: string,
  createdAt: string,
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
    body,
  });

  const text = await response.text();

  return {
    ok: response.ok,
    status: response.status,
    message: text,
  };
};

export default sendPayload;
