import { z } from "zod";
export declare const appDataSchema: z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>;
export declare const appKeysSchema: z.ZodObject<{
    app_id: z.ZodString;
    app_secret: z.ZodString;
    open_verfication_token: z.ZodString;
}, "strip", z.ZodTypeAny, {
    app_id: string;
    app_secret: string;
    open_verfication_token: string;
}, {
    app_id: string;
    app_secret: string;
    open_verfication_token: string;
}>;
//# sourceMappingURL=zod.d.ts.map