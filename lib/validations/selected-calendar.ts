import { withValidation } from "next-validations";
import { z } from "zod";

const schemaSelectedCalendar = z.object({}).strict();
const withValidSelectedCalendar = withValidation({
  schema: schemaSelectedCalendar,
  type: "Zod",
  mode: "body",
});

export { schemaSelectedCalendar, withValidSelectedCalendar };
