import { z } from "zod";

export type TAddNotificationsSubscriptionInputSchema = {
  subscription: string;
};

export const ZAddNotificationsSubscriptionInputSchema: z.ZodType<TAddNotificationsSubscriptionInputSchema> =
  z.object({
    subscription: z.string(),
  });
