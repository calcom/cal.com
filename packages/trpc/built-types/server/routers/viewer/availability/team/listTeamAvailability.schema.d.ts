import { z } from "zod";
export declare const ZListTeamAvailaiblityScheme: z.ZodObject<{
    limit: z.ZodNumber;
    cursor: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    startDate: z.ZodString;
    endDate: z.ZodString;
    loggedInUsersTz: z.ZodString;
    teamId: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    startDate: string;
    endDate: string;
    limit: number;
    loggedInUsersTz: string;
    cursor?: number | null | undefined;
    teamId?: number | undefined;
}, {
    startDate: string;
    endDate: string;
    limit: number;
    loggedInUsersTz: string;
    cursor?: number | null | undefined;
    teamId?: number | undefined;
}>;
export type TListTeamAvailaiblityScheme = z.infer<typeof ZListTeamAvailaiblityScheme>;
