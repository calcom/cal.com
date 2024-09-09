import { z } from "zod";
export declare const ZRemoveMemberInputSchema: z.ZodObject<{
    teamIds: z.ZodArray<z.ZodNumber, "many">;
    memberIds: z.ZodArray<z.ZodNumber, "many">;
    isOrg: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    isOrg: boolean;
    teamIds: number[];
    memberIds: number[];
}, {
    teamIds: number[];
    memberIds: number[];
    isOrg?: boolean | undefined;
}>;
export type TRemoveMemberInputSchema = z.infer<typeof ZRemoveMemberInputSchema>;
