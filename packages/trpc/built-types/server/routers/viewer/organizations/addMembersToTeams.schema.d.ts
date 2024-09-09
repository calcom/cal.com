import { z } from "zod";
export declare const ZAddMembersToTeams: z.ZodObject<{
    userIds: z.ZodArray<z.ZodNumber, "many">;
    teamIds: z.ZodArray<z.ZodNumber, "many">;
}, "strip", z.ZodTypeAny, {
    userIds: number[];
    teamIds: number[];
}, {
    userIds: number[];
    teamIds: number[];
}>;
export type TAddMembersToTeams = z.infer<typeof ZAddMembersToTeams>;
