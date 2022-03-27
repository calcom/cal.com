import { withValidation } from "next-validations";
import { z } from "zod";

const schemaMembership = z
  .object({})
  .strict(); // Adding strict so that we can disallow passing in extra fields
const withValidMembership = withValidation({
  schema: schemaMembership,
  type: "Zod",
  mode: "body",
});

export { schemaMembership, withValidMembership };
