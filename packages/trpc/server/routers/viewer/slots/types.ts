import type { IncomingMessage } from "http";
import { z } from "zod";

import { timeZoneSchema } from "@calcom/lib/dayjs/timeZone.schema";

export const getScheduleSchema = z
  .object({
    // startTime ISOString
    startTime: z.string(),
    // endTime ISOString
    endTime: z.string(),
    // Event type ID
    eventTypeId: z.coerce.number().int().optional(),
    // Event type slug
    eventTypeSlug: z.string().optional(),
    // invitee timezone
    timeZone: timeZoneSchema.optional(),
    // or list of users (for dynamic events)
    usernameList: z.array(z.string()).min(1).optional(),
    debug: z.boolean().optional(),
    // to handle event types with multiple duration options
    duration: z
      .string()
      .optional()
      .transform((val) => val && parseInt(val)),
    rescheduleUid: z.string().nullish(),
    // whether to do team event or user event
    isTeamEvent: z.boolean().optional().default(false),
    orgSlug: z.string().nullish(),
    teamMemberEmail: z.string().nullish(),
    routedTeamMemberIds: z.array(z.number()).nullish(),
    skipContactOwner: z.boolean().nullish(),
    _enableTroubleshooter: z.boolean().optional(),
    _bypassCalendarBusyTimes: z.boolean().optional(),
    _shouldServeCache: z.boolean().optional(),
    routingFormResponseId: z.number().optional(),
    queuedFormResponseId: z.string().nullish(),
    email: z.string().nullish(),
  })
  .transform((val) => {
    // Need this so we can pass a single username in the query string form public API
    if (val.usernameList) {
      val.usernameList = Array.isArray(val.usernameList) ? val.usernameList : [val.usernameList];
    }
    if (!val.orgSlug) {
      val.orgSlug = null;
    }
    return val;
  })
  .refine(
    (data) => !!data.eventTypeId || (!!data.usernameList && !!data.eventTypeSlug),
    "You need to either pass an eventTypeId OR an usernameList/eventTypeSlug combination"
  );

export const reserveSlotSchema = z
  .object({
    eventTypeId: z.number().int(),
    // startTime ISOString
    slotUtcStartDate: z.string(),
    // endTime ISOString
    slotUtcEndDate: z.string(),
    _isDryRun: z.boolean().optional(),
  })
  .refine(
    (data) => !!data.eventTypeId || !!data.slotUtcStartDate || !!data.slotUtcEndDate,
    "Either slotUtcStartDate, slotUtcEndDate or eventTypeId should be filled in."
  );

export type Slot = {
  time: string;
  userIds?: number[];
  attendees?: number;
  bookingUid?: string;
  users?: string[];
};

export const removeSelectedSlotSchema = z.object({
  uid: z.string().nullable(),
});

export interface ContextForGetSchedule extends Record<string, unknown> {
  req?: (IncomingMessage & { cookies: Partial<{ [key: string]: string }> }) | undefined;
}

export type TGetScheduleInputSchema = z.infer<typeof getScheduleSchema>;
export const ZGetScheduleInputSchema = getScheduleSchema;

export type GetScheduleOptions = {
  ctx?: ContextForGetSchedule;
  input: TGetScheduleInputSchema;
};
