import { z } from "zod";
export declare const ZGetMembersInput: z.ZodObject<{
    teamIdToExclude: z.ZodOptional<z.ZodNumber>;
    accepted: z.ZodOptional<z.ZodBoolean>;
    distinctUser: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    distinctUser: boolean;
    teamIdToExclude?: number | undefined;
    accepted?: boolean | undefined;
}, {
    teamIdToExclude?: number | undefined;
    accepted?: boolean | undefined;
    distinctUser?: boolean | undefined;
}>;
export type TGetMembersInputSchema = z.infer<typeof ZGetMembersInput>;
