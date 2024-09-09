import { z } from "zod";
export declare const ZAddNotificationsSubscriptionInputSchema: z.ZodObject<{
    subscription: z.ZodString;
}, "strip", z.ZodTypeAny, {
    subscription: string;
}, {
    subscription: string;
}>;
export type TAddNotificationsSubscriptionInputSchema = z.infer<typeof ZAddNotificationsSubscriptionInputSchema>;
