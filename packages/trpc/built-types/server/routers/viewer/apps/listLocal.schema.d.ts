import { z } from "zod";
export declare const ZListLocalInputSchema: z.ZodObject<{
    category: z.ZodNativeEnum<{
        conferencing: string;
        calendar: "calendar";
        messaging: "messaging";
        other: "other";
        payment: "payment";
        video: "video";
        web3: "web3";
        automation: "automation";
        analytics: "analytics";
        crm: "crm";
    }>;
}, "strip", z.ZodTypeAny, {
    category: string;
}, {
    category: string;
}>;
export type TListLocalInputSchema = z.infer<typeof ZListLocalInputSchema>;
