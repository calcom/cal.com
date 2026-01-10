import { z } from "zod";

/**
 * DB Read schema has no field type based validation because user might change the type of a field from Type1 to Type2 after some data has been collected with Type1.
 * Parsing that type1 data with type2 schema will fail.
 * So, we just validate that the response conforms to one of the field types' schema.
 */
export const dbReadResponseSchema = z.union([
  z.string(),
  z.boolean(),
  z.string().array(),
  z.object({
    optionValue: z.string(),
    value: z.string(),
  }),
  // For variantsConfig case
  z.record(z.string()),
]);
