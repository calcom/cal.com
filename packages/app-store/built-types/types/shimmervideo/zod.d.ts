import { z } from "zod";
export declare const appKeysSchema: z.ZodObject<{
    api_key: z.ZodString;
    api_route: z.ZodString;
}, "strip", z.ZodTypeAny, {
    api_key: string;
    api_route: string;
}, {
    api_key: string;
    api_route: string;
}>;
export declare const appDataSchema: z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>;
//# sourceMappingURL=zod.d.ts.map