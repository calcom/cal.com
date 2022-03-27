import { withValidation } from "next-validations";
import { z } from "zod";

const schemaEventType = z
  .object({
    title: z.string().min(3),
    slug: z.string().min(3),
    length: z.number().min(1).max(1440), // max is a full day.
    description: z.string().min(3).optional(),
  })
  .strict(); 
const withValidEventType = withValidation({
  schema: schemaEventType,
  type: "Zod",
  mode: "body",
});

export { schemaEventType, withValidEventType };
