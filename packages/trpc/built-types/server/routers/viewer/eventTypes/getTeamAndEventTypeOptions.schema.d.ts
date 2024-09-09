import { z } from "zod";
export declare const ZGetTeamAndEventTypeOptionsSchema: z.ZodOptional<z.ZodNullable<z.ZodObject<{
    teamId: z.ZodOptional<z.ZodNumber>;
    isOrg: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    isOrg: boolean;
    teamId?: number | undefined;
}, {
    teamId?: number | undefined;
    isOrg?: boolean | undefined;
}>>>;
export type TGetTeamAndEventTypeOptionsSchema = z.infer<typeof ZGetTeamAndEventTypeOptionsSchema>;
