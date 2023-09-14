import { z } from "zod";

import { DailyLocationType } from "@calcom/app-store/locations";

import { commonBookingSchema } from "./types";

export const ZEditLocationInputSchema = commonBookingSchema.extend({
  newLocation: z.string().transform((val) => val || DailyLocationType),
  details: z.object({ credentialId: z.number().optional() }).optional(),
});

export type TEditLocationInputSchema = z.infer<typeof ZEditLocationInputSchema>;
