import { z } from "zod";
export declare const ZCreateTeamsSchema: z.ZodObject<{
    teamNames: z.ZodArray<z.ZodString, "many">;
    orgId: z.ZodNumber;
    moveTeams: z.ZodArray<z.ZodObject<{
        id: z.ZodNumber;
        newSlug: z.ZodNullable<z.ZodString>;
        shouldMove: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        id: number;
        newSlug: string | null;
        shouldMove: boolean;
    }, {
        id: number;
        newSlug: string | null;
        shouldMove: boolean;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    orgId: number;
    teamNames: string[];
    moveTeams: {
        id: number;
        newSlug: string | null;
        shouldMove: boolean;
    }[];
}, {
    orgId: number;
    teamNames: string[];
    moveTeams: {
        id: number;
        newSlug: string | null;
        shouldMove: boolean;
    }[];
}>;
export type TCreateTeamsSchema = z.infer<typeof ZCreateTeamsSchema>;
