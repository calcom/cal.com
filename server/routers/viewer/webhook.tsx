import { WebhookTriggerEvents } from "@prisma/client";
import { getErrorFromUnknown } from "pages/_error";
import { z } from "zod";

import { createProtectedRouter } from "@server/createRouter";

export const webhookRouter = createProtectedRouter().mutation("testTrigger", {
  input: z.object({
    url: z.string().url(),
    type: z.string(),
  }),
  async resolve({ input }) {
    const { url, type } = input;

    const responseBodyMocks: Record<WebhookTriggerEvents, unknown> = {
      BOOKING_CANCELLED: {},
      BOOKING_CREATED: {},
      BOOKING_RESCHEDULED: {},
    };

    const body = responseBodyMocks[type as WebhookTriggerEvents];
    if (!body) {
      throw new Error(`Unknown type '${type}'`);
    }

    console.log({ url, type });
    try {
      const res = await fetch(url, {
        method: "POST",
        // [...]
        body: JSON.stringify(body),
      });
      const text = await res.text();
      return {
        status: res.status,
        text,
      };
    } catch (_err) {
      const err = getErrorFromUnknown(_err);
      return {
        message: err.message,
      };
    }
  },
});
