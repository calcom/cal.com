import * as z from "zod";

import * as imports from "../zod-utils";

// Helper schema for JSON fields
type Literal = boolean | number | string;
type Json = Literal | { [key: string]: Json } | Json[];
const literalSchema = z.union([z.string(), z.number(), z.boolean()]);
const jsonSchema: z.ZodSchema<Json> = z.lazy(() =>
  z.union([literalSchema, z.array(jsonSchema), z.record(jsonSchema)])
);

export const _IntegrationCredentialModel = z.object({
  id: z.number().int(),
  key: z.string(),
  value: jsonSchema,
});
