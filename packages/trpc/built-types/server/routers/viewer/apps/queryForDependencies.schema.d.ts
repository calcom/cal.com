import { z } from "zod";
export declare const ZQueryForDependenciesInputSchema: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
export type TQueryForDependenciesInputSchema = z.infer<typeof ZQueryForDependenciesInputSchema>;
