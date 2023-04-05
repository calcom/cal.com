import z from "zod";

import { DailyLocationType } from "@calcom/app-store/locations";

import { commonBookingSchema } from "./commonBookingSchema";

export const editLocationSchema = commonBookingSchema.extend({
  newLocation: z.string().transform((val) => val || DailyLocationType),
});
