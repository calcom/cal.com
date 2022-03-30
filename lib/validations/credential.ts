import { withValidation } from "next-validations";
import { z } from "zod";

const schemaCredential = z.object({}).strict();
const withValidCredential = withValidation({
  schema: schemaCredential,
  type: "Zod",
  mode: "body",
});

export { schemaCredential, withValidCredential };
