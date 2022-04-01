import { withValidation } from "next-validations";
import { z } from "zod";

import { _BookingReferenceModel as BookingReference } from "@calcom/prisma/zod";

export const schemaBookingReferenceBaseBodyParams = BookingReference.omit({ id: true }).partial();

export const schemaBookingReferencePublic = BookingReference.omit({});

const schemaBookingReferenceRequiredParams = z.object({
  type: z.string(),
  uid: z.string(),
});

export const schemaBookingReferenceBodyParams = schemaBookingReferenceBaseBodyParams.merge(
  schemaBookingReferenceRequiredParams
);

export const withValidBookingReference = withValidation({
  schema: schemaBookingReferenceBodyParams,
  type: "Zod",
  mode: "body",
});
