import { withValidation } from "next-validations";
import { z } from "zod";

const schemaMembership = z
  .object({})
  .strict(); 
const withValidMembership = withValidation({
  schema: schemaMembership,
  type: "Zod",
  mode: "body",
});

export { schemaMembership, withValidMembership };
