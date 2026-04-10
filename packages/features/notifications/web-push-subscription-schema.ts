import { z } from "zod";

export const browserPushSubscriptionSchema = z.object({
  endpoint: z.string(),
  expirationTime: z.unknown().optional(),
  keys: z.object({
    auth: z.string(),
    p256dh: z.string(),
  }),
});

export type BrowserPushSubscription = z.infer<typeof browserPushSubscriptionSchema>;

export const parseBrowserSubscription = (subscription: string) => {
  try {
    return browserPushSubscriptionSchema.safeParse(JSON.parse(subscription));
  } catch {
    return browserPushSubscriptionSchema.safeParse(null);
  }
};
