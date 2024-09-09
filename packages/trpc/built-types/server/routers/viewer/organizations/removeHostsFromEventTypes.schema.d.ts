import { z } from "zod";
export declare const ZRemoveHostsFromEventTypes: z.ZodObject<{
    userIds: z.ZodArray<z.ZodNumber, "many">;
    eventTypeIds: z.ZodArray<z.ZodNumber, "many">;
}, "strip", z.ZodTypeAny, {
    userIds: number[];
    eventTypeIds: number[];
}, {
    userIds: number[];
    eventTypeIds: number[];
}>;
export type TRemoveHostsFromEventTypes = z.infer<typeof ZRemoveHostsFromEventTypes>;
