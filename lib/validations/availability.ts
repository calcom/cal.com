import { withValidation } from "next-validations";

import { _AvailabilityModel as Availability } from "@calcom/prisma/zod";

export const schemaAvailabilityBodyParams = Availability.omit({ id: true });

export const schemaAvailabilityPublic = Availability.omit({});

export const withValidAvailability = withValidation({
  schema: schemaAvailabilityBodyParams,
  type: "Zod",
  mode: "body",
});
