import type { z } from "zod";
export declare const ZRemoveSelectedSlotInputSchema: z.ZodObject<{
    uid: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    uid: string | null;
}, {
    uid: string | null;
}>;
export type TRemoveSelectedSlotInputSchema = z.infer<typeof ZRemoveSelectedSlotInputSchema>;
