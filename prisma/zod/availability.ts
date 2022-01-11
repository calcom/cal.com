import type { Availability } from "@prisma/client";
import * as z from "zod";

import { CompleteUser, UserModel, CompleteEventType, EventTypeModel } from "./index";

export const _AvailabilityModel = z.object({
  id: z.number().int(),
  label: z.string().nullable(),
  userId: z.number().int().nullable(),
  eventTypeId: z.number().int().nullable(),
  days: z.number().int().array(),
  startTime: z.date(),
  endTime: z.date(),
  date: z.date().nullable(),
});

export interface CompleteAvailability extends Availability {
  user: CompleteUser | null;
  eventType: CompleteEventType | null;
}

/**
 * AvailabilityModel contains all relations on your model in addition to the scalars
 *
 * NOTE: Lazy required in case of potential circular dependencies within schema
 */
export const AvailabilityModel: z.ZodSchema<CompleteAvailability> = z.lazy(() =>
  _AvailabilityModel.extend({
    user: UserModel.nullable(),
    eventType: EventTypeModel.nullable(),
  })
);
