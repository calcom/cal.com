import { z } from "zod";
export declare const ZHasEditPermissionForUserSchema: z.ZodObject<{
    memberId: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    memberId: number;
}, {
    memberId: number;
}>;
export type THasEditPermissionForUserSchema = z.infer<typeof ZHasEditPermissionForUserSchema>;
