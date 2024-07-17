import { z } from "zod";

import { _AttendeeModel as Attendee } from "@calcom/prisma/zod";

import { timeZone } from "~/lib/validations/shared/timeZone";

export const schemaAttendeeBaseBodyParams = Attendee.pick({
  bookingId: true,
  email: true,
  name: true,
  timeZone: true,
});

const schemaAttendeeCreateParams = z
  .object({
    bookingId: z.number().int(),
    email: z.string().email(),
    name: z.string(),
    timeZone: timeZone,
  })
  .strict();

const schemaAttendeeEditParams = z
  .object({
    name: z.string().optional(),
    email: z.string().email().optional(),
    timeZone: timeZone.optional(),
  })
  .strict();
export const schemaAttendeeEditBodyParams = schemaAttendeeBaseBodyParams.merge(schemaAttendeeEditParams);
export const schemaAttendeeCreateBodyParams = schemaAttendeeBaseBodyParams.merge(schemaAttendeeCreateParams);

export const schemaAttendeeReadPublic = Attendee.pick({
  id: true,
  bookingId: true,
  name: true,
  email: true,
  timeZone: true,
});
