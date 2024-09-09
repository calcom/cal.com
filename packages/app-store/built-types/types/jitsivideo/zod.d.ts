import { z } from "zod";
export declare const appKeysSchema: z.ZodObject<{
    jitsiHost: z.ZodOptional<z.ZodString>;
    jitsiPathPattern: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    jitsiHost?: string | undefined;
    jitsiPathPattern?: string | undefined;
}, {
    jitsiHost?: string | undefined;
    jitsiPathPattern?: string | undefined;
}>;
export declare const appDataSchema: z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>;
//# sourceMappingURL=zod.d.ts.map