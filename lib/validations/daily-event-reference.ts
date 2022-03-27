import { withValidation } from "next-validations";
import { z } from "zod";

const schemaDailyEventReference = z
  .object({})
  .strict(); 
const withValidDailyEventReference = withValidation({
  schema: schemaDailyEventReference,
  type: "Zod",
  mode: "body",
});

export { schemaDailyEventReference, withValidDailyEventReference };
