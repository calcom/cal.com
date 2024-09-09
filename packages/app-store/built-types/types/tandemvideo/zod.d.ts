import { z } from "zod";
export declare const appDataSchema: z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>;
export declare const appKeysSchema: z.ZodObject<{
    client_id: z.ZodString;
    client_secret: z.ZodString;
    base_url: z.ZodString;
}, "strip", z.ZodTypeAny, {
    client_id: string;
    client_secret: string;
    base_url: string;
}, {
    client_id: string;
    client_secret: string;
    base_url: string;
}>;
//# sourceMappingURL=zod.d.ts.map