import { z } from "zod";
export declare const ZListMembersInputSchema: z.ZodObject<{
    teamIds: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
}, "strip", z.ZodTypeAny, {
    teamIds?: number[] | undefined;
}, {
    teamIds?: number[] | undefined;
}>;
export type TListMembersInputSchema = z.infer<typeof ZListMembersInputSchema>;
