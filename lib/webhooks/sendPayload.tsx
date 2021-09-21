import { CalendarEvent } from "@lib/calendarClient";

const sendPayload = (
  triggerEvent: string,
  createdAt: string,
  sub: string,
  payload: CalendarEvent
): Promise<string | Response> =>
  new Promise((resolve, reject) => {
    if (!sub || !payload) {
      return reject("Missing required elements to send webhook payload.");
    }

    fetch("http://mockbin.org/bin/27716cd4-e78a-4d5f-9e3f-c83c41229ac0?foo=bar&foo=baz", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        triggerEvent: triggerEvent,
        createdAt: createdAt,
        payload: payload,
      }),
    })
      .then((response) => {
        resolve(response);
      })
      .catch((err) => {
        reject(err);
      });
  });

export default sendPayload;
