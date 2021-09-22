import { CalendarEvent } from "@lib/calendarClient";

const sendPayload = (
  triggerEvent: string,
  createdAt: string,
  subscriberUrl: string,
  payload: CalendarEvent
): Promise<string | Response> =>
  new Promise((resolve, reject) => {
    if (!subscriberUrl || !payload) {
      return reject("Missing required elements to send webhook payload.");
    }

    fetch(subscriberUrl, {
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
