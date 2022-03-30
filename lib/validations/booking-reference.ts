import { withValidation } from "next-validations";
import { z } from "zod";

const schemaBookingReference = z.object({}).strict();
const withValidBookingReference = withValidation({
  schema: schemaBookingReference,
  type: "Zod",
  mode: "body",
});

export { schemaBookingReference, withValidBookingReference };
