import { z } from "zod";

import type { TemplateType } from "@calcom/features/calAIPhone/zod-utils";
import { templateTypeEnum } from "@calcom/features/calAIPhone/zod-utils";
import { MAX_SEATS_PER_TIME_SLOT } from "@calcom/lib/constants";
import type { PeriodType, SchedulingType } from "@calcom/prisma/enums";
import type {
  CustomInputSchema,
  EventTypeMetadata,
  IntervalLimit,
  EventTypeLocation,
} from "@calcom/prisma/zod-utils";
import {
  customInputSchema,
  EventTypeMetaDataSchema,
  rrSegmentQueryValueSchema,
  eventTypeLocations,
  recurringEventType,
  intervalLimitsType,
  eventTypeBookingFields,
  eventTypeColor,
} from "@calcom/prisma/zod-utils";

// ============================================================================
// EXPLICIT TYPE DEFINITIONS
// ============================================================================
// These explicit types prevent TypeScript from having to infer complex types
// through chains of .extend(), .partial(), .merge() etc. This significantly
// reduces type-checking time by giving TypeScript the answer directly.
// ============================================================================

type HashedLinkInput = {
  link: string;
  expiresAt?: Date | null;
  maxUsageCount?: number | null;
  usageCount?: number | null;
};

type AiPhoneCallConfig = {
  generalPrompt: string;
  enabled: boolean;
  beginMessage: string | null;
  yourPhoneNumber: string;
  numberToCall: string;
  guestName?: string | null;
  guestEmail?: string | null;
  guestCompany?: string | null;
  templateType: TemplateType;
};

type CalVideoSettings = {
  disableRecordingForGuests?: boolean | null;
  disableRecordingForOrganizer?: boolean | null;
  enableAutomaticTranscription?: boolean | null;
  enableAutomaticRecordingForOrganizer?: boolean | null;
  disableTranscriptionForGuests?: boolean | null;
  disableTranscriptionForOrganizer?: boolean | null;
  redirectUrlOnExit?: string | null;
  requireEmailForGuests?: boolean | null;
} | null;

type HostLocationInput = {
  id?: string;
  userId: number;
  eventTypeId: number;
  type: string;
  credentialId?: number | null;
  link?: string | null;
  address?: string | null;
  phoneNumber?: string | null;
};

type HostInput = {
  userId: number;
  profileId?: number | null;
  isFixed?: boolean;
  priority?: number | null;
  weight?: number | null;
  scheduleId?: number | null;
  groupId?: string | null;
  location?: HostLocationInput | null;
};

type HostGroupInput = {
  id: string;
  name: string;
};

type ChildInput = {
  owner: {
    id: number;
    name: string;
    email: string;
    eventTypeSlugs: string[];
  };
  hidden: boolean;
};

type DestinationCalendarInput = {
  integration: string;
  externalId: string;
} | null;

type RecurringEventInput = {
  dtstart?: Date;
  interval: number;
  count: number;
  freq: number;
  until?: Date;
  tzid?: string;
} | null;

type EventTypeColorInput = {
  lightEventTypeColor: string;
  darkEventTypeColor: string;
} | null;

/**
 * Booking field type - minimal type definition for fields that need to be accessed.
 * Only includes properties that are actually read in server code.
 * Does NOT use an index signature to maintain compatibility with API v2 DTO classes.
 */
type BookingFieldInput = {
  name: string;
  hidden?: boolean;
  required?: boolean;
  type?: string;
};

/**
 * RR Segment query value - using index signature for complex RAQB structure.
 * The values need to be indexable (string keys) for downstream usage.
 */
type RRSegmentQueryValueInput = {
  [key: string]: unknown;
} | null;

/**
 * Explicit type definition for event type update input.
 *
 * This type is defined explicitly rather than using z.infer<> on a complex
 * schema chain to significantly reduce TypeScript type-checking time.
 * The schema still validates all fields at runtime.
 *
 * All fields are optional (from .partial()) except `id` which is required.
 */
export type TUpdateInputSchema = {
  // Required field
  id: number;

  // Fields from EventTypeSchema (all optional due to .partial())
  periodType?: PeriodType;
  schedulingType?: SchedulingType | null;
  title?: string;
  slug?: string;
  description?: string | null;
  interfaceLanguage?: string | null;
  position?: number;
  locations?: EventTypeLocation[] | null;
  length?: number;
  offsetStart?: number;
  hidden?: boolean;
  userId?: number | null;
  profileId?: number | null;
  teamId?: number | null;
  useEventLevelSelectedCalendars?: boolean;
  eventName?: string | null;
  parentId?: number | null;
  bookingFields?: BookingFieldInput[] | null;
  timeZone?: string | null;
  periodStartDate?: Date | null;
  periodEndDate?: Date | null;
  periodDays?: number | null;
  periodCountCalendarDays?: boolean | null;
  lockTimeZoneToggleOnBookingPage?: boolean;
  lockedTimeZone?: string | null;
  requiresConfirmation?: boolean;
  requiresConfirmationWillBlockSlot?: boolean;
  requiresConfirmationForFreeEmail?: boolean;
  requiresBookerEmailVerification?: boolean;
  canSendCalVideoTranscriptionEmails?: boolean;
  autoTranslateDescriptionEnabled?: boolean;
  autoTranslateInstantMeetingTitleEnabled?: boolean;
  recurringEvent?: RecurringEventInput;
  disableGuests?: boolean;
  hideCalendarNotes?: boolean;
  hideCalendarEventDetails?: boolean;
  minimumBookingNotice?: number;
  beforeEventBuffer?: number;
  afterEventBuffer?: number;
  seatsPerTimeSlot?: number | null;
  onlyShowFirstAvailableSlot?: boolean;
  showOptimizedSlots?: boolean | null;
  disableCancelling?: boolean | null;
  disableRescheduling?: boolean | null;
  minimumRescheduleNotice?: number | null;
  seatsShowAttendees?: boolean | null;
  seatsShowAvailabilityCount?: boolean | null;
  scheduleId?: number | null;
  allowReschedulingCancelledBookings?: boolean | null;
  price?: number;
  currency?: string;
  slotInterval?: number | null;
  metadata?: EventTypeMetadata;
  successRedirectUrl?: string | null;
  forwardParamsSuccessRedirect?: boolean | null;
  redirectUrlOnNoRoutingFormResponse?: string | null;
  bookingLimits?: IntervalLimit | null;
  durationLimits?: IntervalLimit | null;
  isInstantEvent?: boolean;
  instantMeetingExpiryTimeOffsetInSeconds?: number;
  instantMeetingScheduleId?: number | null;
  instantMeetingParameters?: string[];
  assignAllTeamMembers?: boolean;
  assignRRMembersUsingSegment?: boolean;
  rrSegmentQueryValue?: RRSegmentQueryValueInput;
  useEventTypeDestinationCalendarEmail?: boolean;
  isRRWeightsEnabled?: boolean;
  maxLeadThreshold?: number | null;
  includeNoShowInRRCalculation?: boolean;
  allowReschedulingPastBookings?: boolean;
  hideOrganizerEmail?: boolean;
  maxActiveBookingsPerBooker?: number | null;
  maxActiveBookingPerBookerOfferReschedule?: boolean;
  customReplyToEmail?: string | null;
  eventTypeColor?: EventTypeColorInput;
  rescheduleWithSameRoundRobinHost?: boolean;
  secondaryEmailId?: number | null;
  useBookerTimezone?: boolean;
  restrictionScheduleId?: number | null;
  bookingRequiresAuthentication?: boolean;
  rrHostSubsetEnabled?: boolean;
  createdAt?: Date | null;
  updatedAt?: Date | null;

  // Extended fields (all optional due to .partial())
  aiPhoneCallConfig?: AiPhoneCallConfig;
  calVideoSettings?: CalVideoSettings;
  calAiPhoneScript?: string;
  customInputs?: CustomInputSchema[];
  destinationCalendar?: DestinationCalendarInput;
  users?: number[];
  children?: ChildInput[];
  hosts?: HostInput[];
  schedule?: number | null;
  instantMeetingSchedule?: number | null;
  multiplePrivateLinks?: (string | HashedLinkInput)[];
  hostGroups?: HostGroupInput[];
  enablePerHostLocations?: boolean;
};

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

const hashedLinkInputSchema: z.ZodType<HashedLinkInput> = z
  .object({
    link: z.string(),
    expiresAt: z.date().nullish(),
    maxUsageCount: z.number().nullish(),
    usageCount: z.number().nullish(),
  })
  .strict();

const aiPhoneCallConfigSchema: z.ZodType<AiPhoneCallConfig | undefined> = z
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

const calVideoSettingsSchema: z.ZodType<CalVideoSettings | undefined> = z
  .object({
    disableRecordingForGuests: z.boolean().nullish(),
    disableRecordingForOrganizer: z.boolean().nullish(),
    enableAutomaticTranscription: z.boolean().nullish(),
    enableAutomaticRecordingForOrganizer: z.boolean().nullish(),
    disableTranscriptionForGuests: z.boolean().nullish(),
    disableTranscriptionForOrganizer: z.boolean().nullish(),
    redirectUrlOnExit: z.string().url().nullish(),
    requireEmailForGuests: z.boolean().nullish(),
  })
  .optional()
  .nullable();

const hostLocationSchema = z.object({
  id: z.string().optional(),
  userId: z.number(),
  eventTypeId: z.number(),
  type: z.string(),
  credentialId: z.number().optional().nullable(),
  link: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  phoneNumber: z.string().optional().nullable(),
});

const hostSchema: z.ZodType<HostInput> = z.object({
  userId: z.number(),
  profileId: z.number().or(z.null()).optional(),
  isFixed: z.boolean().optional(),
  priority: z.number().min(0).max(4).optional().nullable(),
  weight: z.number().min(0).optional().nullable(),
  scheduleId: z.number().optional().nullable(),
  groupId: z.string().optional().nullable(),
  location: hostLocationSchema.optional().nullable(),
});

const hostGroupSchema: z.ZodType<HostGroupInput> = z.object({
  id: z.string().uuid(),
  name: z.string(),
});

const childSchema: z.ZodType<ChildInput> = z.object({
  owner: z.object({
    id: z.number(),
    name: z.string(),
    email: z.string(),
    eventTypeSlugs: z.array(z.string()),
  }),
  hidden: z.boolean(),
});

const destinationCalendarInputSchema: z.ZodType<DestinationCalendarInput> = z
  .object({
    integration: z.string(),
    externalId: z.string(),
  })
  .nullable();

/**
 * Base schema for event type updates.
 *
 * Uses z.ZodType<TUpdateInputSchema> annotation to prevent TypeScript from
 * inferring the complex type through the schema chain. This is a key
 * optimization that reduces type-checking time significantly.
 */
const BaseEventTypeUpdateInput: z.ZodType<TUpdateInputSchema> = z
  .object({
    // Required field
    id: z.number().int(),

    // Fields from EventTypeSchema
    periodType: z.enum(["UNLIMITED", "ROLLING", "ROLLING_WINDOW", "RANGE"]).optional(),
    schedulingType: z.enum(["ROUND_ROBIN", "COLLECTIVE", "MANAGED"]).nullable().optional(),
    title: z.string().min(1).optional(),
    slug: z.string().optional(),
    description: z.string().nullable().optional(),
    interfaceLanguage: z.string().nullable().optional(),
    position: z.number().int().optional(),
    locations: eventTypeLocations.nullable().optional(),
    length: z.number().min(1).optional(),
    offsetStart: z.number().int().optional(),
    hidden: z.boolean().optional(),
    userId: z.number().int().nullable().optional(),
    profileId: z.number().int().nullable().optional(),
    teamId: z.number().int().nullable().optional(),
    useEventLevelSelectedCalendars: z.boolean().optional(),
    eventName: z.string().nullable().optional(),
    parentId: z.number().int().nullable().optional(),
    bookingFields: eventTypeBookingFields.nullable().optional(),
    timeZone: z.string().nullable().optional(),
    periodStartDate: z.coerce.date().nullable().optional(),
    periodEndDate: z.coerce.date().nullable().optional(),
    periodDays: z.number().int().nullable().optional(),
    periodCountCalendarDays: z.boolean().nullable().optional(),
    lockTimeZoneToggleOnBookingPage: z.boolean().optional(),
    lockedTimeZone: z.string().nullable().optional(),
    requiresConfirmation: z.boolean().optional(),
    requiresConfirmationWillBlockSlot: z.boolean().optional(),
    requiresConfirmationForFreeEmail: z.boolean().optional(),
    requiresBookerEmailVerification: z.boolean().optional(),
    canSendCalVideoTranscriptionEmails: z.boolean().optional(),
    autoTranslateDescriptionEnabled: z.boolean().optional(),
    autoTranslateInstantMeetingTitleEnabled: z.boolean().optional(),
    recurringEvent: recurringEventType.nullable().optional(),
    disableGuests: z.boolean().optional(),
    hideCalendarNotes: z.boolean().optional(),
    hideCalendarEventDetails: z.boolean().optional(),
    minimumBookingNotice: z.number().min(0).optional(),
    beforeEventBuffer: z.number().int().optional(),
    afterEventBuffer: z.number().int().optional(),
    seatsPerTimeSlot: z.number().min(1).max(MAX_SEATS_PER_TIME_SLOT).nullable().optional(),
    onlyShowFirstAvailableSlot: z.boolean().optional(),
    showOptimizedSlots: z.boolean().nullable().optional(),
    disableCancelling: z.boolean().nullable().optional(),
    disableRescheduling: z.boolean().nullable().optional(),
    minimumRescheduleNotice: z.number().min(0).nullable().optional(),
    seatsShowAttendees: z.boolean().nullable().optional(),
    seatsShowAvailabilityCount: z.boolean().nullable().optional(),
    scheduleId: z.number().int().nullable().optional(),
    allowReschedulingCancelledBookings: z.boolean().nullable().optional(),
    price: z.number().int().optional(),
    currency: z.string().optional(),
    slotInterval: z.number().int().nullable().optional(),
    metadata: EventTypeMetaDataSchema.optional(),
    successRedirectUrl: z.string().nullable().optional(),
    forwardParamsSuccessRedirect: z.boolean().nullable().optional(),
    redirectUrlOnNoRoutingFormResponse: z.string().nullable().optional(),
    bookingLimits: intervalLimitsType.nullable().optional(),
    durationLimits: intervalLimitsType.nullable().optional(),
    isInstantEvent: z.boolean().optional(),
    instantMeetingExpiryTimeOffsetInSeconds: z.number().int().optional(),
    instantMeetingScheduleId: z.number().int().nullable().optional(),
    instantMeetingParameters: z.string().array().optional(),
    assignAllTeamMembers: z.boolean().optional(),
    assignRRMembersUsingSegment: z.boolean().optional(),
    rrSegmentQueryValue: rrSegmentQueryValueSchema.nullable().optional(),
    useEventTypeDestinationCalendarEmail: z.boolean().optional(),
    isRRWeightsEnabled: z.boolean().optional(),
    maxLeadThreshold: z.number().int().nullable().optional(),
    includeNoShowInRRCalculation: z.boolean().optional(),
    allowReschedulingPastBookings: z.boolean().optional(),
    hideOrganizerEmail: z.boolean().optional(),
    maxActiveBookingsPerBooker: z.number().int().nullable().optional(),
    maxActiveBookingPerBookerOfferReschedule: z.boolean().optional(),
    customReplyToEmail: z.string().nullable().optional(),
    eventTypeColor: eventTypeColor.nullable().optional(),
    rescheduleWithSameRoundRobinHost: z.boolean().optional(),
    secondaryEmailId: z.number().int().nullable().optional(),
    useBookerTimezone: z.boolean().optional(),
    restrictionScheduleId: z.number().int().nullable().optional(),
    bookingRequiresAuthentication: z.boolean().optional(),
    rrHostSubsetEnabled: z.boolean().optional(),
    createdAt: z.coerce.date().nullable().optional(),
    updatedAt: z.coerce.date().nullable().optional(),

    // Extended fields
    aiPhoneCallConfig: aiPhoneCallConfigSchema,
    calVideoSettings: calVideoSettingsSchema,
    calAiPhoneScript: z.string().optional(),
    customInputs: z.array(customInputSchema).optional(),
    destinationCalendar: destinationCalendarInputSchema.optional(),
    users: z.array(z.number()).optional(),
    children: z.array(childSchema).optional(),
    hosts: z.array(hostSchema).optional(),
    schedule: z.number().nullable().optional(),
    instantMeetingSchedule: z.number().nullable().optional(),
    multiplePrivateLinks: z.array(z.union([z.string(), hashedLinkInputSchema])).optional(),
    hostGroups: z.array(hostGroupSchema).optional(),
    enablePerHostLocations: z.boolean().optional(),
  })
  .strict();

export const ZUpdateInputSchema = BaseEventTypeUpdateInput.superRefine((data, _ctx) => {
  // Apply transformations to aiPhoneCallConfig if present
  if (data.aiPhoneCallConfig) {
    data.aiPhoneCallConfig.yourPhoneNumber = data.aiPhoneCallConfig.yourPhoneNumber || "";
    data.aiPhoneCallConfig.numberToCall = data.aiPhoneCallConfig.numberToCall || "";
    data.aiPhoneCallConfig.guestName = data.aiPhoneCallConfig.guestName ?? undefined;
    data.aiPhoneCallConfig.guestEmail = data.aiPhoneCallConfig.guestEmail ?? null;
    data.aiPhoneCallConfig.guestCompany = data.aiPhoneCallConfig.guestCompany ?? null;
  }
});
