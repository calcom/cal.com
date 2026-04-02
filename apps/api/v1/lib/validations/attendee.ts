import { emailSchema } from "@calcom/lib/emailSchema";
import { AttendeeSchema } from "@calcom/prisma/zod/modelSchema/AttendeeSchema";
import { z } from "zod";
import { timeZone } from "~/lib/validations/shared/timeZone";

export const schemaAttendeeBaseBodyParams = AttendeeSchema.pick({
  bookingId: true,
  email: true,
  name: true,
  timeZone: true,
});

const schemaAttendeeCreateParams = z
  .object({
    bookingId: z.number().int(),
    email: emailSchema,
    name: z.string(),
    timeZone: timeZone,
  })
  .strict();

const schemaAttendeeEditParams = z
  .object({
    name: z.string().optional(),
    email: emailSchema.optional(),
    timeZone: timeZone.optional(),
  })
  .strict();
export const schemaAttendeeEditBodyParams = schemaAttendeeBaseBodyParams.merge(schemaAttendeeEditParams);
export const schemaAttendeeCreateBodyParams = schemaAttendeeBaseBodyParams.merge(schemaAttendeeCreateParams);

export const schemaAttendeeReadPublic = AttendeeSchema.pick({
  id: true,
  bookingId: true,
  name: true,
  email: true,
  timeZone: true,
});
