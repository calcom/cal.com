import { DailyLocationType } from "@calcom/app-store/constants";
import { z } from "zod";
import { commonBookingSchema } from "./types";

export const ZEditLocationInputSchema = commonBookingSchema.extend({
  newLocation: z.string().transform((val) => val || DailyLocationType),
  credentialId: z.number().nullable(),
});

export type TEditLocationInputSchema = z.infer<typeof ZEditLocationInputSchema>;
