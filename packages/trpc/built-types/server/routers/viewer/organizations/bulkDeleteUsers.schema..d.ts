import { z } from "zod";
export declare const ZBulkUsersDelete: z.ZodObject<{
    userIds: z.ZodArray<z.ZodNumber, "many">;
}, "strip", z.ZodTypeAny, {
    userIds: number[];
}, {
    userIds: number[];
}>;
export type TBulkUsersDelete = z.infer<typeof ZBulkUsersDelete>;
