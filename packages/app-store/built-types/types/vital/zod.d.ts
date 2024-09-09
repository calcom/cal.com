import { z } from "zod";
export declare const appDataSchema: z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>;
export declare const appKeysSchema: z.ZodObject<{
    mode: z.ZodString;
    region: z.ZodString;
    api_key: z.ZodString;
    webhook_secret: z.ZodString;
}, "strip", z.ZodTypeAny, {
    api_key: string;
    webhook_secret: string;
    mode: string;
    region: string;
}, {
    api_key: string;
    webhook_secret: string;
    mode: string;
    region: string;
}>;
//# sourceMappingURL=zod.d.ts.map