import { withValidation } from "next-validations";
import { z } from "zod";

import { _AvailabilityModel as Availability } from "@calcom/prisma/zod";

export const schemaAvailabilityBaseBodyParams = Availability.pick({
  startTime: true,
  endTime: true,
  date: true,
  scheduleId: true,
  days: true,
}).partial();

export const schemaAvailabilityPublic = Availability.omit({});

const schemaAvailabilityRequiredParams = z.object({
  startTime: z.date(),
  endTime: z.date(),
  days: z.array(z.number()).optional(),
  eventTypeId: z.number().optional(),
});

export const schemaAvailabilityBodyParams = schemaAvailabilityBaseBodyParams.merge(
  schemaAvailabilityRequiredParams
);

export const withValidAvailability = withValidation({
  schema: schemaAvailabilityBodyParams,
  type: "Zod",
  mode: "body",
});
