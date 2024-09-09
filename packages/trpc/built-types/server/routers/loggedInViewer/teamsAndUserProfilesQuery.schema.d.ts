import { z } from "zod";
export declare const ZTeamsAndUserProfilesQueryInputSchema: z.ZodOptional<z.ZodObject<{
    includeOrg: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    includeOrg?: boolean | undefined;
}, {
    includeOrg?: boolean | undefined;
}>>;
export type TTeamsAndUserProfilesQueryInputSchema = z.infer<typeof ZTeamsAndUserProfilesQueryInputSchema>;
