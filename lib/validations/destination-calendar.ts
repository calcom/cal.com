import { withValidation } from "next-validations";
import { z } from "zod";

const schemaDestinationCalendar = z.object({}).strict();
const withValidDestinationCalendar = withValidation({
  schema: schemaDestinationCalendar,
  type: "Zod",
  mode: "body",
});

export { schemaDestinationCalendar, withValidDestinationCalendar };
