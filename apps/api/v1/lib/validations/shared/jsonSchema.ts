import { z } from "zod";

// Helper schema for JSON fields
type Literal = boolean | number | string | null;
type Json = Literal | { [key: string]: Json } | Json[];
const literalSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);
const jsonObjectSchema = z.record(z.lazy(() => jsonSchema));
const jsonArraySchema = z.array(z.lazy(() => jsonSchema));
export const jsonSchema: z.ZodSchema<Json> = z.lazy(() =>
  z.union([literalSchema, jsonObjectSchema, jsonArraySchema])
);
