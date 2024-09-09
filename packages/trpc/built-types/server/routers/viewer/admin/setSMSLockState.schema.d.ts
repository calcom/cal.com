import { z } from "zod";
export declare const ZSetSMSLockState: z.ZodObject<{
    userId: z.ZodOptional<z.ZodNumber>;
    username: z.ZodOptional<z.ZodString>;
    teamId: z.ZodOptional<z.ZodNumber>;
    teamSlug: z.ZodOptional<z.ZodString>;
    lock: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    userId?: number | undefined;
    username?: string | undefined;
    teamId?: number | undefined;
    teamSlug?: string | undefined;
    lock?: boolean | undefined;
}, {
    userId?: number | undefined;
    username?: string | undefined;
    teamId?: number | undefined;
    teamSlug?: string | undefined;
    lock?: boolean | undefined;
}>;
export type TSetSMSLockState = z.infer<typeof ZSetSMSLockState>;
