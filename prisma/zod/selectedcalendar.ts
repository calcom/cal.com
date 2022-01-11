import type { SelectedCalendar } from "@prisma/client";
import * as z from "zod";

import { CompleteUser, UserModel } from "./index";

export const _SelectedCalendarModel = z.object({
  userId: z.number().int(),
  integration: z.string(),
  externalId: z.string(),
});

export interface CompleteSelectedCalendar extends SelectedCalendar {
  user: CompleteUser;
}

/**
 * SelectedCalendarModel contains all relations on your model in addition to the scalars
 *
 * NOTE: Lazy required in case of potential circular dependencies within schema
 */
export const SelectedCalendarModel: z.ZodSchema<CompleteSelectedCalendar> = z.lazy(() =>
  _SelectedCalendarModel.extend({
    user: UserModel,
  })
);
