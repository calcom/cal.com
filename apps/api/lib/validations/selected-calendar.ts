import z from "zod";

import { _SelectedCalendarModel as SelectedCalendar } from "@calcom/prisma/zod";

import { schemaQueryIdAsString } from "./shared/queryIdString";
import { schemaQueryIdParseInt } from "./shared/queryIdTransformParseInt";

export const schemaSelectedCalendarBaseBodyParams = SelectedCalendar;

export const schemaSelectedCalendarPublic = SelectedCalendar.omit({});

export const schemaSelectedCalendarBodyParams = schemaSelectedCalendarBaseBodyParams.partial({
  userId: true,
});

export const schemaSelectedCalendarUpdateBodyParams = schemaSelectedCalendarBaseBodyParams.partial();

export const selectedCalendarIdSchema = schemaQueryIdAsString.transform((v, ctx) => {
  /** We can assume the first part is the userId since it's an integer */
  const [userIdStr, ...rest] = v.id.split("_");
  /** We can assume that the remainder is both the integration type and external id combined */
  const integration_externalId = rest.join("_");
  /**
   * Since we only handle calendars here we can split by `_calendar_` and re add it later on.
   * This handle special cases like `google_calendar_c_blabla@group.calendar.google.com` and
   * `hubspot_other_calendar`.
   **/
  const [_integration, externalId] = integration_externalId.split("_calendar_");
  const userIdInt = schemaQueryIdParseInt.safeParse({ id: userIdStr });
  if (!userIdInt.success) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "userId is not a number" });
    return z.NEVER;
  }
  if (!_integration) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Missing integration" });
    return z.NEVER;
  }
  if (!externalId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Missing externalId" });
    return z.NEVER;
  }
  return {
    userId: userIdInt.data.id,
    /** We re-add the split `_calendar` string */
    integration: `${_integration}_calendar`,
    externalId,
  };
});
