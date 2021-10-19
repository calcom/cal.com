import { z } from "zod";

import { createProtectedRouter } from "@server/createRouter";

export const webhookRouter = createProtectedRouter().mutation("testTrigger", {
  input: z.object({
    url: z.string().url(),
    type: z.enum(["BOOKING_CREATED", "BOOKING_RESCHEDULED", "BOOKING_CANCELLED"]),
  }),
  async resolve({ input }) {
    const { url, type } = input;

    console.log({ url, type });

    const res = await fetch(url, {
      method: "POST",
      // [...]
    });
    const text = await res.text();
    return {
      status: res.status,
      text,
    };
  },
});
