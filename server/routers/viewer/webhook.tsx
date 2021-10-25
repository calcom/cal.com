import { z } from "zod";

import { getErrorFromUnknown } from "@lib/errors";

import { createProtectedRouter } from "@server/createRouter";

export const webhookRouter = createProtectedRouter().mutation("testTrigger", {
  input: z.object({
    url: z.string().url(),
    type: z.string(),
  }),
  async resolve({ input }) {
    const { url, type } = input;

    const responseBodyMocks: Record<"PING", unknown> = {
      PING: {
        triggerEvent: "PING",
        createdAt: new Date().toISOString(),
        payload: {
          type: "Test",
          title: "Test trigger event",
          description: "",
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
          organizer: {
            name: "Cal",
            email: "",
            timeZone: "Europe/London",
          },
        },
      },
    };

    const body = responseBodyMocks[type as "PING"];
    if (!body) {
      throw new Error(`Unknown type '${type}'`);
    }

    try {
      const res = await fetch(url, {
        method: "POST",
        // [...]
        body: JSON.stringify(body),
      });
      const text = await res.text();
      return {
        status: res.status,
        message: text,
      };
    } catch (_err) {
      const err = getErrorFromUnknown(_err);
      return {
        status: 500,
        message: err.message,
      };
    }
  },
});
