import { withValidation } from "next-validations";
import { z } from "zod";

const schemaPayment = z.object({}).strict();
const withValidPayment = withValidation({
  schema: schemaPayment,
  type: "Zod",
  mode: "body",
});

export { schemaPayment, withValidPayment };
