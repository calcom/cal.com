import { withValidation } from "next-validations";
import { z } from "zod";

import { _AvailabilityModel as Availability } from "@calcom/prisma/zod";

export const schemaAvailabilityBaseBodyParams = Availability.omit({ id: true }).partial();

export const schemaAvailabilityPublic = Availability.omit({});

const schemaAvailabilityRequiredParams = z.object({
  startTime: z.string(),
  endTime: z.string(),
});

export const schemaAvailabilityBodyParams = schemaAvailabilityBaseBodyParams.merge(
  schemaAvailabilityRequiredParams
);

export const withValidAvailability = withValidation({
  schema: schemaAvailabilityBodyParams,
  type: "Zod",
  mode: "body",
});
