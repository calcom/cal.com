import { withValidation } from "next-validations";
import { z } from "zod";

const schemaAttendee = z
  .object({
    id: z.number(),
    email: z.string().min(3),
    name: z.string().min(3).email(),
    timeZone: z.string().default("Europe/London"),
    locale: z.string().optional(),
    bookingId: z.number(),
  })
  .strict();
const withValidAttendee = withValidation({
  schema: schemaAttendee,
  type: "Zod",
  mode: "body",
});

export { schemaAttendee, withValidAttendee };
