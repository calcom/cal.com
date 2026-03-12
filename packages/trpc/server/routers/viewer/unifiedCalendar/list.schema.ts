import { z } from "zod";

const ZCursorSchema = z.object({
  startTime: z.string().datetime(),
  id: z.string().min(1),
});

export const ZUnifiedCalendarListInputSchema = z.object({
  from: z.string().datetime(),
  to: z.string().datetime(),
  cursor: ZCursorSchema.nullish(),
  limit: z.number().int().min(1).max(500).default(100),
  clampEnabled: z.boolean().optional().default(true),
  includeExternalEvents: z.boolean().optional().default(true),
  includeCancelledExternal: z.boolean().optional().default(false),
  includeCancelledInternal: z.boolean().optional().default(false),
  showAsBusyOnly: z.boolean().optional().default(false),
  includeExternalCalendarIds: z.array(z.number().int().positive()).optional(),
  excludeExternalCalendarIds: z.array(z.number().int().positive()).optional(),
});

export const ZUnifiedCalendarItemSchema = z.object({
  source: z.enum(["INTERNAL", "EXTERNAL"]),
  id: z.string(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  isAllDay: z.boolean(),
  timeZone: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  meetingUrl: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  showAsBusy: z.boolean(),
  status: z.enum(["CONFIRMED", "CANCELLED", "TENTATIVE"]),
  attendees: z.array(z.string()).optional(),
  external: z
    .object({
      calendarId: z.number().int(),
      provider: z.string(),
      externalEventId: z.string(),
      iCalUID: z.string().nullable().optional(),
    })
    .optional(),
  internal: z
    .object({
      bookingId: z.number().int(),
      eventTypeId: z.number().int().nullable().optional(),
      attendeeCount: z.number().int().nullable().optional(),
    })
    .optional(),
});

export const ZUnifiedCalendarListOutputSchema = z.object({
  items: z.array(ZUnifiedCalendarItemSchema),
  nextCursor: ZCursorSchema.nullish(),
});

export type TUnifiedCalendarListInput = z.infer<typeof ZUnifiedCalendarListInputSchema>;
export type TUnifiedCalendarListOutput = z.infer<typeof ZUnifiedCalendarListOutputSchema>;
