import { z } from "zod";
export declare const ZGetUserConnectedAppsInputSchema: z.ZodObject<{
    userIds: z.ZodArray<z.ZodNumber, "many">;
    teamId: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    teamId: number;
    userIds: number[];
}, {
    teamId: number;
    userIds: number[];
}>;
export type TGetUserConnectedAppsInputSchema = z.infer<typeof ZGetUserConnectedAppsInputSchema>;
