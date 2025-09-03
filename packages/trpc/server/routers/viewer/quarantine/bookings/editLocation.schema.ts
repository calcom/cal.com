import { z } from "zod";

import { DailyLocationType } from "@calcom/app-store/locations";

import { commonBookingSchema } from "../../bookings/types";

export const ZEditLocationInputSchema = commonBookingSchema.extend({
  newLocation: z.string().transform((val) => val || DailyLocationType),
  credentialId: z.number().nullable(),
});

export type TEditLocationInputSchema = z.infer<typeof ZEditLocationInputSchema>;
