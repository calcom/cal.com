import { z } from "zod";
declare const ZFindInputSchema: z.ZodObject<{
    bookingUid: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    bookingUid?: string | undefined;
}, {
    bookingUid?: string | undefined;
}>;
export type TFindInputSchema = z.infer<typeof ZFindInputSchema>;
export { ZFindInputSchema };
