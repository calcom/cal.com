import { z } from "zod";

export const ZAddNotificationsSubscriptionInputSchema = z.object({
  subscription: z.string(),
});

export type TAddNotificationsSubscriptionInputSchema = z.infer<
  typeof ZAddNotificationsSubscriptionInputSchema
>;
