import { CalendarEvent } from "@lib/calendarClient";

const sendPayload = (
  triggerEvent: string,
  createdAt: string,
  subscriberUrl: string,
  payload: CalendarEvent
): Promise<string | Response> =>
  new Promise((resolve, reject) => {
    if (!subscriberUrl || !payload) {
      return reject(new Error("Missing required elements to send webhook payload."));
    }
    const body = {
      triggerEvent: triggerEvent,
      createdAt: createdAt,
      payload: payload,
    };

    fetch(subscriberUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })
      .then((response) => {
        if (!response.ok) {
          reject(new Error(`Response code ${response.status}`));
          return;
        }
        resolve(response);
      })
      .catch((err) => {
        reject(err);
      });
  });

export default sendPayload;
