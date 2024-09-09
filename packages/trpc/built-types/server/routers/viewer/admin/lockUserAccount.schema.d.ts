import { z } from "zod";
export declare const ZAdminLockUserAccountSchema: z.ZodObject<{
    userId: z.ZodNumber;
    locked: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    userId: number;
    locked: boolean;
}, {
    userId: number;
    locked: boolean;
}>;
export type TAdminLockUserAccountSchema = z.infer<typeof ZAdminLockUserAccountSchema>;
