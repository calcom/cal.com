import { z } from "zod";
export declare const ZLazyLoadMembersInputSchema: z.ZodObject<{
    teamId: z.ZodNumber;
    limit: z.ZodDefault<z.ZodNumber>;
    searchTerm: z.ZodOptional<z.ZodString>;
    cursor: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    teamId: number;
    limit: number;
    searchTerm?: string | undefined;
    cursor?: number | null | undefined;
}, {
    teamId: number;
    limit?: number | undefined;
    searchTerm?: string | undefined;
    cursor?: number | null | undefined;
}>;
export type TLazyLoadMembersInputSchema = z.infer<typeof ZLazyLoadMembersInputSchema>;
