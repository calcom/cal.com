import { compile } from "handlebars";

import { CalendarEvent } from "@lib/integrations/calendar/interfaces/Calendar";

type ContentType = "application/json" | "application/x-www-form-urlencoded";

function applyTemplate(template: string, data: CalendarEvent, contentType: ContentType) {
  const compiled = compile(template)(data);
  if (contentType === "application/json") {
    return jsonParse(compiled);
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
  triggerEvent: string,
  createdAt: string,
  subscriberUrl: string,
  data: CalendarEvent & {
    metadata?: { [key: string]: string };
  },
  template?: string | null
) => {
  if (!subscriberUrl || !data) {
    throw new Error("Missing required elements to send webhook payload.");
  }

  const contentType =
    !template || jsonParse(template) ? "application/json" : "application/x-www-form-urlencoded";

  const body = template
    ? applyTemplate(template, data, contentType)
    : JSON.stringify({
        triggerEvent: triggerEvent,
        createdAt: createdAt,
        payload: data,
      });

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
