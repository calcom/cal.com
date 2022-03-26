import { withValidation } from "next-validations";
import { z } from "zod";

const schemaApiKey = z
  .object({
    // We need to cast the date as strings as when we get it from the json response
    // we serve in api it is a string too (JSON doesn't directly support Date types)
    createdAt: z.date().optional().or(z.string().optional()),
    expiresAt:  z.date().optional(), // default is 30 days
    note: z.string().min(1).optional(),
  })
  .strict(); // Adding strict so that we can disallow passing in extra fields
const withValidApiKey = withValidation({
  schema: schemaApiKey,
  type: "Zod",
  mode: "body",
});

export { schemaApiKey, withValidApiKey };
