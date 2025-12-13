import type { IncomingMessage } from "http";
import { z } from "zod";

import { timeZoneSchema } from "@calcom/lib/dayjs/timeZone.schema";

const isValidDateString = (val: string) => !isNaN(Date.parse(val));

// Define type first to use with z.ZodType annotation
// This prevents full Zod generic tree from being emitted in .d.ts files
export type TGetScheduleSchemaObject = {
  startTime: string;
  endTime: string;
  eventTypeId?: number;
  eventTypeSlug?: string;
  timeZone?: string;
  usernameList?: string[];
  debug?: boolean;
  duration?: string;
  rescheduleUid?: string | null;
  isTeamEvent?: boolean;
  orgSlug?: string | null;
  teamMemberEmail?: string | null;
  routedTeamMemberIds?: number[] | null;
  skipContactOwner?: boolean | null;
  rrHostSubsetIds?: number[] | null;
  _enableTroubleshooter?: boolean;
  _bypassCalendarBusyTimes?: boolean;
  _silentCalendarFailures?: boolean;
  routingFormResponseId?: number;
  queuedFormResponseId?: string | null;
  email?: string | null;
};

export const getScheduleSchemaObject: z.ZodType<TGetScheduleSchemaObject> = z.object({
  startTime: z.string().refine(isValidDateString, {
    message: "startTime must be a valid date string",
  }),
  endTime: z.string().refine(isValidDateString, {
    message: "endTime must be a valid date string",
  }),
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
  rrHostSubsetIds: z.array(z.number()).nullish(),
  _enableTroubleshooter: z.boolean().optional(),
  _bypassCalendarBusyTimes: z.boolean().optional(),
  _silentCalendarFailures: z.boolean().optional(),
  routingFormResponseId: z.number().optional(),
  queuedFormResponseId: z.string().nullish(),
  email: z.string().nullish(),
});

export const getScheduleSchema = getScheduleSchemaObject
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
  )
  .refine(({ startTime, endTime }) => new Date(endTime).getTime() > new Date(startTime).getTime(), {
    message: "endTime must be after startTime",
    path: ["endTime"],
  });

// Define type for reserveSlotSchema
export type TReserveSlotSchema = {
  eventTypeId: number;
  slotUtcStartDate: string;
  slotUtcEndDate: string;
  _isDryRun?: boolean;
};

export const reserveSlotSchema: z.ZodType<TReserveSlotSchema> = z
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

// Define type for removeSelectedSlotSchema
export type TRemoveSelectedSlotSchema = {
  uid: string | null;
};

export const removeSelectedSlotSchema: z.ZodType<TRemoveSelectedSlotSchema> = z.object({
  uid: z.string().nullable(),
});

export interface ContextForGetSchedule extends Record<string, unknown> {
  req?: (IncomingMessage & { cookies: Partial<{ [key: string]: string }> }) | undefined;
}

export type TGetScheduleInputSchema = z.infer<typeof getScheduleSchemaObject>;
export const ZGetScheduleInputSchema = getScheduleSchema;

export type GetScheduleOptions = {
  ctx?: ContextForGetSchedule;
  input: TGetScheduleInputSchema;
};
