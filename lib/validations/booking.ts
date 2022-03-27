import { withValidation } from "next-validations";
import { z } from "zod";

const schemaBooking = z
  .object({
    uid: z.string().min(3),
    title: z.string().min(3),
    description: z.string().min(3).optional(),
    startTime: z.date().or(z.string()),
    endTime: z.date(),
    location: z.string().min(3).optional(),
    createdAt: z.date().or(z.string()),
    updatedAt: z.date(),
    confirmed: z.boolean().default(true),
    rejected: z.boolean().default(false),
    paid: z.boolean().default(false),
  })
  .strict(); 
const withValidBooking = withValidation({
  schema: schemaBooking,
  type: "Zod",
  mode: "body",
});

export { schemaBooking, withValidBooking };
