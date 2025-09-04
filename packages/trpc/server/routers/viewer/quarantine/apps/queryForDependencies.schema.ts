import { z } from "zod";

export const ZQueryForDependenciesInputSchema = z.string().array().optional();

export type TQueryForDependenciesInputSchema = z.infer<typeof ZQueryForDependenciesInputSchema>;
