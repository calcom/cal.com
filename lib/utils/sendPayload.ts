/* eslint-disable @typescript-eslint/no-explicit-any */
import { Webhook } from "@prisma/client";
import { compile } from "handlebars";

// import type { CalendarEvent } from "@calcom/types/Calendar"; Add this to make it strict, change data: any to CalendarEvent type

type ContentType = "application/json" | "application/x-www-form-urlencoded";

function applyTemplate(template: string, data: any, contentType: ContentType) {
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
    console.error(`error jsonParsing in sendPayload`);
  }
  return false;
}

const sendPayload = async (
  triggerEvent: string,
  createdAt: string,
  webhook: Pick<Webhook, "subscriberUrl" | "appId" | "payloadTemplate">,
  data: any & {
    metadata?: { [key: string]: string };
    rescheduleUid?: string;
    bookingId?: number;
  }
) => {
  const { subscriberUrl, appId, payloadTemplate: template } = webhook;
  if (!subscriberUrl || !data) {
    throw new Error("Missing required elements to send webhook payload.");
  }

  const contentType =
    !template || jsonParse(template) ? "application/json" : "application/x-www-form-urlencoded";

  data.description = data.description || data.additionalNotes;

  let body;

  /* Zapier id is hardcoded in the DB, we send the raw data for this case  */
  if (appId === "zapier") {
    body = JSON.stringify(data);
  } else if (template) {
    body = applyTemplate(template, data, contentType);
  } else {
    body = JSON.stringify({
      triggerEvent: triggerEvent,
      createdAt: createdAt,
      payload: data,
    });
  }

  const response = await fetch(subscriberUrl, {
    method: "POST",
    headers: {
      "Content-Type": contentType,
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
