import * as z from "zod";
import * as imports from "../zod-utils";
import { CompleteBooking, BookingModel } from "./index";

export const _DailyEventReferenceModel = z.object({
  id: z.number().int(),
  dailyurl: z.string(),
  dailytoken: z.string(),
  bookingId: z.number().int().nullish(),
});

export interface CompleteDailyEventReference extends z.infer<typeof _DailyEventReferenceModel> {
  booking?: CompleteBooking | null;
}

/**
 * DailyEventReferenceModel contains all relations on your model in addition to the scalars
 *
 * NOTE: Lazy required in case of potential circular dependencies within schema
 */
export const DailyEventReferenceModel: z.ZodSchema<CompleteDailyEventReference> = z.lazy(() =>
  _DailyEventReferenceModel.extend({
    booking: BookingModel.nullish(),
  })
);
