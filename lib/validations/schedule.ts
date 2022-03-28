import { withValidation } from "next-validations";
import { z } from "zod";

const schemaSchedule = z
  .object({})
  .strict(); 
const withValidSchedule = withValidation({
  schema: schemaSchedule,
  type: "Zod",
  mode: "body",
});

export { schemaSchedule, withValidSchedule };
