import { withValidation } from "next-validations";
import { z } from "zod";

import { _UserModel as User } from "@calcom/prisma/zod";

// @note: These are the ONLY values allowed as weekStart. So user don't introduce bad data.
enum weekdays {
  MONDAY = "Monday",
  TUESDAY = "Tuesday",
  WEDNESDAY = "Wednesday",
  THURSDAY = "Thursday",
  FRIDAY = "Friday",
  SATURDAY = "Saturday",
  SUNDAY = "Sunday",
}

// @note: These are the values that are editable via PATCH method on the user Model
export const schemaUserBaseBodyParams = User.pick({
  name: true,
  bio: true,
  avatar: true,
  timeZone: true,
  weekStart: true,
  endTime: true,
  bufferTime: true,
  theme: true,
  defaultScheduleId: true,
  locale: true,
  timeFormat: true,
  brandColor: true,
  darkBrandColor: true,
  allowDynamicBooking: true,
  away: true,
}).partial();
// @note: partial() is used to allow for the user to edit only the fields they want to edit making all optional,
// if want to make any required do it in the schemaRequiredParams

// Here we can both require or not (adding optional or nullish) and also rewrite validations for any value
// for example making weekStart only accept weekdays as input
const schemaUserRequiredParams = z.object({
  weekStart: z.nativeEnum(weekdays).optional(),
});

// @note: These are the values that are editable via PATCH method on the user Model
export const schemaUserEditBodyParams = schemaUserBaseBodyParams.merge(schemaUserRequiredParams).omit({});

// @note: These are the values that are always returned when reading a user
export const schemaUserReadPublic = User.pick({
  id: true,
  username: true,
  name: true,
  email: true,
  emailVerified: true,
  bio: true,
  avatar: true,
  timeZone: true,
  weekStart: true,
  endTime: true,
  bufferTime: true,
  theme: true,
  defaultScheduleId: true,
  locale: true,
  timeFormat: true,
  brandColor: true,
  darkBrandColor: true,
  allowDynamicBooking: true,
  away: true,
  createdDate: true,
  verified: true,
  invitedTo: true,
});

// @note: This is the validation for the PATCH method on the user Model. Not used for now.
export const withValidUser = withValidation({ schema: schemaUserEditBodyParams, type: "Zod", mode: "body" });
