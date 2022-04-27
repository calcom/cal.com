import { z } from "zod";

import { _DailyEventReferenceModel as DailyEventReference } from "@calcom/prisma/zod";

export const schemaDailyEventReferenceBaseBodyParams = DailyEventReference.pick({
  dailytoken: true,
  dailyurl: true,
  bookingId: true,
}).partial();

const schemaDailyEventReferenceCreateParams = z.object({
  dailytoken: z.string(),
  dailyurl: z.string(),
  bookingId: z.number(),
});

export const schemaDailyEventReferenceCreateBodyParams = schemaDailyEventReferenceBaseBodyParams.merge(
  schemaDailyEventReferenceCreateParams
);

const schemaDailyEventReferenceEditParams = z.object({
  dailytoken: z.string(),
  dailyurl: z.string(),
  // @note: disallowing bookingId changes in daily-event-reference via API endpoint for now as it would introduce side effects
});

export const schemaDailyEventReferenceEditBodyParams = schemaDailyEventReferenceBaseBodyParams.merge(
  schemaDailyEventReferenceEditParams
);
export const schemaDailyEventReferenceReadPublic = DailyEventReference.pick({
  id: true,
  dailytoken: true,
  dailyurl: true,
  bookingId: true,
});
