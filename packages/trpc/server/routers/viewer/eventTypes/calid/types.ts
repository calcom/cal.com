import { z } from "zod";

import { MAX_SEATS_PER_TIME_SLOT } from "@calcom/lib/constants";
import { _DestinationCalendarModel, _EventTypeModel } from "@calcom/prisma/zod";
import {
  customInputSchema,
  EventTypeMetaDataSchema,
  stringOrNumber,
  rrSegmentQueryValueSchema,
} from "@calcom/prisma/zod-utils";
import { eventTypeBookingFields } from "@calcom/prisma/zod-utils";

const hashedLinkInputSchema = z
  .object({
    link: z.string(),
    expiresAt: z.date().nullish(),
    maxUsageCount: z.number().nullish(),
    usageCount: z.number().nullish(),
  })
  .strict();

const hostSchema = z.object({
  userId: z.number(),
  profileId: z.number().or(z.null()).optional(),
  isFixed: z.boolean().optional(),
  priority: z.number().min(0).max(4).optional().nullable(),
  weight: z.number().min(0).optional().nullable(),
  scheduleId: z.number().optional().nullable(),
});

const childSchema = z.object({
  owner: z.object({
    id: z.number(),
    name: z.string(),
    email: z.string(),
    eventTypeSlugs: z.array(z.string()),
  }),
  hidden: z.boolean(),
});

/** Optional fields */
const BaseEventTypeUpdateInput = _EventTypeModel
  .extend({
    isInstantEvent: z.boolean(),
    instantMeetingParameters: z.array(z.string()),
    instantMeetingExpiryTimeOffsetInSeconds: z.number(),
    customInputs: z.array(customInputSchema),
    destinationCalendar: _DestinationCalendarModel
      .pick({
        integration: true,
        externalId: true,
      })
      .nullable(),
    users: z.array(stringOrNumber),
    children: z.array(childSchema),
    hosts: z.array(hostSchema),
    schedule: z.number().nullable(),
    instantMeetingSchedule: z.number().nullable(),
    multiplePrivateLinks: z.array(z.union([z.string(), hashedLinkInputSchema])),
    assignAllTeamMembers: z.boolean(),
    isRRWeightsEnabled: z.boolean(),
    metadata: EventTypeMetaDataSchema,
    bookingFields: eventTypeBookingFields,
    assignRRMembersUsingSegment: z.boolean().optional(),
    rrSegmentQueryValue: rrSegmentQueryValueSchema.optional(),
    useEventLevelSelectedCalendars: z.boolean().optional(),
    seatsPerTimeSlot: z.number().min(1).max(MAX_SEATS_PER_TIME_SLOT).nullable().optional(),
  })
  .partial()
  .extend(_EventTypeModel.pick({ id: true }).shape);

export const ZCalIdUpdateInputSchema = BaseEventTypeUpdateInput.strict();
// only run infer over the simple type, excluding refines/transforms.
export type TCalIdUpdateInputSchema = z.infer<typeof BaseEventTypeUpdateInput>;
