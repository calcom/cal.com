import { z } from "zod";

import { createProtectedRouter } from "@server/createRouter";

export const webhookRouter = createProtectedRouter().mutation("testTrigger", {
  input: z.object({
    url: z.string().url(),
    type: z.enum(["BOOKING_CREATED", "BOOKING_RESCHEDULED", "BOOKING_CANCELLED"]),
  }),
  async resolve({ input }) {
    const { url, type } = input;

    const responseBodyMocks: Record<typeof type, unknown> = {
      BOOKING_CREATED: {},
      BOOKING_CANCELLED: {},
      BOOKING_RESCHEDULED: {},
    };

    console.log({ url, type });

    const res = await fetch(url, {
      method: "POST",
      body: JSON.stringify(responseBodyMocks[type]),
    });
    const text = await res.text();
    return {
      status: res.status,
      text,
    };
  },
});
