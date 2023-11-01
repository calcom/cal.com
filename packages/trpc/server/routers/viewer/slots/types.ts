import { z } from "zod";

const iso8601Schema = z.string().refine(
  (value) => {
    // Attempt to parse the string as a date
    const date = new Date(value);
    // Check if the date is valid and the string is in ISO 8601 format
    return !isNaN(date.getTime()) && value === date.toISOString();
  },
  {
    message: "The string must be a valid ISO 8601 date string",
  }
);

const isStartTimeBeforeEndTime = (startTime: string, endTime: string) => {
  const start = new Date(startTime);
  const end = new Date(endTime);
  return start < end;
};

export const getScheduleSchema = z
  .object({
    // startTime as ISO 8601 string
    startTime: iso8601Schema,
    // endTime as ISO 8601 string
    endTime: iso8601Schema,
    // Event type ID
    eventTypeId: z.coerce.number().int().optional(),
    // Event type slug
    eventTypeSlug: z.string().optional(),
    // invitee timezone
    timeZone: z.string().optional(),
    // or list of users (for dynamic events)
    usernameList: z.array(z.string()).min(1).optional(),
    debug: z.boolean().optional(),
    // to handle event types with multiple duration options
    duration: z
      .string()
      .optional()
      .transform((val) => val && parseInt(val)),
    rescheduleUid: z.string().optional().nullable(),
    // whether to do team event or user event
    isTeamEvent: z.boolean().optional().default(false),
  })
  .transform((val) => {
    // Need this so we can pass a single username in the query string form public API
    if (val.usernameList) {
      val.usernameList = Array.isArray(val.usernameList) ? val.usernameList : [val.usernameList];
    }
    return val;
  })
  .refine(
    (data) => !!data.eventTypeId || (!!data.usernameList && !!data.eventTypeSlug),
    "You need to either pass an eventTypeId OR an usernameList/eventTypeSlug combination"
  )
  .refine(
    (data) => isStartTimeBeforeEndTime(data.startTime, data.endTime),
    "Start time must be before end time."
  );

export const reserveSlotSchema = z
  .object({
    eventTypeId: z.number().int(),
    // startTime ISOString
    slotUtcStartDate: z.string(),
    // endTime ISOString
    slotUtcEndDate: z.string(),
    bookingUid: z.string().optional(),
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
