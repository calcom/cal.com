import { z } from "zod";

export const ZRemoveNotificationsSubscriptionInputSchema = z.object({
  subscription: z.string(),
});

export type TRemoveNotificationsSubscriptionInputSchema = z.input<
  typeof ZRemoveNotificationsSubscriptionInputSchema
>;
