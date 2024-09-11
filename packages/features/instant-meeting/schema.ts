import { z } from "zod";

export const subscriptionSchema = z.object({
  endpoint: z.string(),
  expirationTime: z.any().optional(),
  keys: z.object({
    auth: z.string(),
    p256dh: z.string(),
  }),
});
