import { z } from "zod";
export declare const ZAddMembersToEventTypes: z.ZodObject<{
    userIds: z.ZodArray<z.ZodNumber, "many">;
    teamIds: z.ZodArray<z.ZodNumber, "many">;
    eventTypeIds: z.ZodArray<z.ZodNumber, "many">;
}, "strip", z.ZodTypeAny, {
    userIds: number[];
    teamIds: number[];
    eventTypeIds: number[];
}, {
    userIds: number[];
    teamIds: number[];
    eventTypeIds: number[];
}>;
export type TAddMembersToEventTypes = z.infer<typeof ZAddMembersToEventTypes>;
