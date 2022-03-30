import { withValidation } from "next-validations";

import { _BookingReferenceModel as BookingReference } from "@calcom/prisma/zod";

export const schemaBookingReferenceBodyParams = BookingReference.omit({ id: true });

export const schemaBookingReferencePublic = BookingReference.omit({});

export const withValidBookingReference = withValidation({
  schema: schemaBookingReferenceBodyParams,
  type: "Zod",
  mode: "body",
});
