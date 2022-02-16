import * as z from "zod";
import * as imports from "../zod-utils";
import { CompleteUser, UserModel } from "./index";

export const _SelectedCalendarModel = z.object({
  userId: z.number().int(),
  integration: z.string(),
  externalId: z.string(),
});

export interface CompleteSelectedCalendar extends z.infer<typeof _SelectedCalendarModel> {
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
