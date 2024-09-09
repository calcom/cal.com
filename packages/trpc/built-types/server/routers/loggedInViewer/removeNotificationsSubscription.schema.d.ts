import { z } from "zod";
export declare const ZRemoveNotificationsSubscriptionInputSchema: z.ZodObject<{
    subscription: z.ZodString;
}, "strip", z.ZodTypeAny, {
    subscription: string;
}, {
    subscription: string;
}>;
export type TRemoveNotificationsSubscriptionInputSchema = z.infer<typeof ZRemoveNotificationsSubscriptionInputSchema>;
