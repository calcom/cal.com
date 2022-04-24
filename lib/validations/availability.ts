import { withValidation } from "next-validations";
import { z } from "zod";

import { _AvailabilityModel as Availability } from "@calcom/prisma/zod";

export const schemaAvailabilityBaseBodyParams = Availability.pick({ userId: true, eventTypeId: true, days: true }).partial();

export const schemaAvailabilityPublic = Availability.omit({});

const schemaAvailabilityRequiredParams = z.object({
  startTime: z.date().or(z.string()).optional(),
  endTime: z.date().or(z.string()).optional(),
  days: z.any().optional(),
});

export const schemaAvailabilityBodyParams = schemaAvailabilityBaseBodyParams.merge(
  schemaAvailabilityRequiredParams
);

export const withValidAvailability = withValidation({
  schema: schemaAvailabilityBodyParams,
  type: "Zod",
  mode: "body",
});
