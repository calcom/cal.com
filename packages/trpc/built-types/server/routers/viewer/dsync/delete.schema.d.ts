import { z } from "zod";
export declare const ZDeleteInputSchema: z.ZodObject<{
    organizationId: z.ZodUnion<[z.ZodNumber, z.ZodNull]>;
    directoryId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    organizationId: number | null;
    directoryId: string;
}, {
    organizationId: number | null;
    directoryId: string;
}>;
export type ZDeleteInputSchema = z.infer<typeof ZDeleteInputSchema>;
