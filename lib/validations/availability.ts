import { withValidation } from "next-validations";
import { z } from "zod";

const schemaAvailability = z
  .object({
    id: z.number(),
    userId: z.number(),
    eventTypeId: z.number(),
    scheduleId: z.number(),

    days: z.array(z.number()),
    date: z.date().or(z.string()),
    startTime: z.string(),
    endTime: z.string(),
  })
  .strict();
const withValidAvailability = withValidation({
  schema: schemaAvailability,
  type: "Zod",
  mode: "body",
});

export { schemaAvailability, withValidAvailability };
