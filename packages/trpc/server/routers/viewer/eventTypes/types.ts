import { z } from "zod";

import { templateTypeEnum } from "@calcom/features/calAIPhone/zod-utils";
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

const aiPhoneCallConfig = z
  .object({
    generalPrompt: z.string(),
    enabled: z.boolean(),
    beginMessage: z.string().nullable(),
    yourPhoneNumber: z.string(),
    numberToCall: z.string(),
    guestName: z.string().nullable().optional(),
    guestEmail: z.string().nullable().optional(),
    guestCompany: z.string().nullable().optional(),
    templateType: templateTypeEnum,
  })
  .optional();

// existing host with userId
// Removed unused userHostSchema

const hostGroupSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
});
// allow both
const hostSchema = z
  .object({
    userId: z.number().optional(), //  Make optional
    email: z.string().email().optional(), //  Add email support
    isPending: z.boolean().optional(), //  Add pending status
    profileId: z.number().or(z.null()).optional(),
    isFixed: z.boolean().optional(),
    priority: z.number().min(0).max(4).optional().nullable(),
    weight: z.number().min(0).optional().nullable(),
    scheduleId: z.number().optional().nullable(),
    groupId: z.string().optional().nullable(),
  })
  .refine(
    (data) => {
      //  Ensure either userId OR email is provided
      return data.userId !== undefined || data.email !== undefined;
    },
    {
      message: "Either userId or email must be provided",
    }
  );

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
    aiPhoneCallConfig,
    // calVideoSettingsSchema must be imported from the correct file if used
    calVideoSettings: z.unknown(),
    calAiPhoneScript: z.string(),
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
    hostGroups: z.array(hostGroupSchema).optional(),
  })
  .partial()
  .extend(_EventTypeModel.pick({ id: true }).shape);

export const ZUpdateInputSchema = BaseEventTypeUpdateInput.extend({
  aiPhoneCallConfig: aiPhoneCallConfig.refine(
    (data) => {
      if (!data) return true;
      data.yourPhoneNumber = data.yourPhoneNumber || "";
      data.numberToCall = data.numberToCall || "";
      data.guestName = data.guestName ?? undefined;
      data.guestEmail = data.guestEmail ?? null;
      data.guestCompany = data.guestCompany ?? null;
      return true;
    },
    {
      message: "Applying default values and transformations",
    }
  ),
}).strict();
// only run infer over the simple type, excluding refines/transforms.
export type TUpdateInputSchema = z.infer<typeof BaseEventTypeUpdateInput>;
