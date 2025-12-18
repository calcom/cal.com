import { z } from "zod";

import type { EventLocationType } from "@calcom/app-store/locations";
import type { eventTypeMetaDataSchemaWithTypedApps } from "@calcom/app-store/zod-utils";
import type { ChildrenEventType } from "@calcom/features/eventtypes/components/ChildrenEventTypeSelect";
import type { IntervalLimit } from "@calcom/lib/intervalLimits/intervalLimitSchema";
import type { AttributesQueryValue } from "@calcom/lib/raqb/types";
import type { EventTypeTranslation } from "@calcom/prisma/client";
import { type PeriodType, SchedulingType } from "@calcom/prisma/enums";
import {
  eventTypeLocations,
  EventTypeMetaDataSchema,
  eventTypeSlug,
  type BookerLayoutSettings,
} from "@calcom/prisma/zod-utils";
import type { customInputSchema } from "@calcom/prisma/zod-utils";
import type { eventTypeBookingFields } from "@calcom/prisma/zod-utils";
import type { eventTypeColor } from "@calcom/prisma/zod-utils";
import type { RouterOutputs, RouterInputs } from "@calcom/trpc/react";
import type { RecurringEvent } from "@calcom/types/Calendar";

export type CustomInputParsed = typeof customInputSchema._output;

export type AvailabilityOption = {
  label: string;
  value: number;
  isDefault: boolean;
  isManaged?: boolean;
};
export type EventTypeSetupProps = RouterOutputs["viewer"]["eventTypes"]["get"];
export type EventTypeSetup = RouterOutputs["viewer"]["eventTypes"]["get"]["eventType"];
export type EventTypeApps = RouterOutputs["viewer"]["apps"]["integrations"];
export type Host = {
  isFixed: boolean;
  userId: number;
  priority: number;
  weight: number;
  scheduleId?: number | null;
  groupId: string | null;
};
export type TeamMember = {
  value: string;
  label: string;
  avatar: string;
  email: string;
  defaultScheduleId: number | null;
};

type EventLocation = {
  type: EventLocationType["type"];
  address?: string;
  attendeeAddress?: string;
  somewhereElse?: string;
  link?: string;
  hostPhoneNumber?: string;
  displayLocationPublicly?: boolean;
  phone?: string;
  hostDefault?: string;
  credentialId?: number;
  teamName?: string;
  customLabel?: string;
};

type PhoneCallConfig = {
  generalPrompt: string;
  enabled: boolean;
  beginMessage: string;
  yourPhoneNumber: string;
  numberToCall: string;
  guestName?: string;
  guestEmail?: string;
  guestCompany?: string;
  templateType: string;
  schedulerName?: string;
};

export type PrivateLinkWithOptions = {
  link: string;
  expiresAt?: Date | null;
  maxUsageCount?: number | null;
  usageCount?: number;
};

export type FormValues = {
  id: number;
  title: string;
  eventTitle: string;
  eventName: string;
  slug: string;
  interfaceLanguage: string | null;
  isInstantEvent: boolean;
  instantMeetingParameters: string[];
  instantMeetingExpiryTimeOffsetInSeconds: number;
  length: number;
  offsetStart: number;
  description: string;
  disableGuests: boolean;
  lockTimeZoneToggleOnBookingPage: boolean;
  lockedTimeZone: string | null;
  requiresConfirmation: boolean;
  requiresConfirmationWillBlockSlot: boolean;
  requiresConfirmationForFreeEmail: boolean;
  requiresBookerEmailVerification: boolean;
  recurringEvent: RecurringEvent | null;
  schedulingType: SchedulingType | null;
  hidden: boolean;
  hideCalendarNotes: boolean;
  multiplePrivateLinks: (string | PrivateLinkWithOptions)[] | undefined;
  eventTypeColor: z.infer<typeof eventTypeColor>;
  customReplyToEmail: string | null;
  locations: EventLocation[];
  aiPhoneCallConfig: PhoneCallConfig;
  customInputs: CustomInputParsed[];
  schedule: number | null;
  useEventLevelSelectedCalendars: boolean;
  disabledCancelling: boolean;
  disabledRescheduling: boolean;
  minimumRescheduleNotice: number | null;
  periodType: PeriodType;
  /**
   * Number of days(Applicable only for ROLLING period type)
   */
  periodDays: number;
  /**
   * Should consider Calendar Days(and not Business Days)(Applicable only for ROLLING period type)
   */
  periodCountCalendarDays: boolean;
  /**
   * Date Range(Applicable only for RANGE period type)
   */
  periodDates: { startDate: Date; endDate: Date };
  rollingExcludeUnavailableDays: boolean;

  seatsPerTimeSlot: number | null;
  seatsShowAttendees: boolean | null;
  seatsShowAvailabilityCount: boolean | null;
  seatsPerTimeSlotEnabled: boolean;
  autoTranslateDescriptionEnabled: boolean;
  autoTranslateInstantMeetingTitleEnabled: boolean;
  fieldTranslations: EventTypeTranslation[];
  scheduleName: string;
  minimumBookingNotice: number;
  minimumBookingNoticeInDurationType: number;
  maxActiveBookingsPerBooker: number | null;
  beforeEventBuffer: number;
  afterEventBuffer: number;
  slotInterval: number | null;
  metadata: z.infer<typeof eventTypeMetaDataSchemaWithTypedApps>;
  destinationCalendar: {
    integration: string;
    externalId: string;
  };
  successRedirectUrl: string;
  durationLimits?: IntervalLimit;
  bookingLimits?: IntervalLimit;
  onlyShowFirstAvailableSlot: boolean;
  showOptimizedSlots: boolean;
  children: ChildrenEventType[];
  hosts: Host[];
  hostGroups: {
    id: string;
    name: string;
  }[];
  bookingFields: z.infer<typeof eventTypeBookingFields>;
  availability?: AvailabilityOption;
  bookerLayouts: BookerLayoutSettings;
  multipleDurationEnabled: boolean;
  users: EventTypeSetup["users"];
  assignAllTeamMembers: boolean;
  assignRRMembersUsingSegment: boolean;
  rrSegmentQueryValue: AttributesQueryValue | null;
  rescheduleWithSameRoundRobinHost: boolean;
  useEventTypeDestinationCalendarEmail: boolean;
  forwardParamsSuccessRedirect: boolean | null;
  secondaryEmailId?: number;
  isRRWeightsEnabled: boolean;
  maxLeadThreshold?: number;
  restrictionScheduleId: number | null;
  useBookerTimezone: boolean;
  restrictionScheduleName: string | null;
  calVideoSettings?: CalVideoSettings;
  maxActiveBookingPerBookerOfferReschedule: boolean;
};

export type LocationFormValues = Pick<FormValues, "id" | "locations" | "bookingFields" | "seatsPerTimeSlot">;

export type EventTypeAssignedUsers = RouterOutputs["viewer"]["eventTypes"]["get"]["eventType"]["children"];
export type EventTypeHosts = RouterOutputs["viewer"]["eventTypes"]["get"]["eventType"]["hosts"];
export type EventTypeUpdateInput = RouterInputs["viewer"]["eventTypesHeavy"]["update"];
export type TabMap = {
  advanced: React.ReactNode;
  ai?: React.ReactNode;
  apps?: React.ReactNode;
  availability: React.ReactNode;
  instant?: React.ReactNode;
  limits: React.ReactNode;
  recurring: React.ReactNode;
  setup: React.ReactNode;
  team?: React.ReactNode;
  webhooks?: React.ReactNode;
  workflows?: React.ReactNode;
  payments?: React.ReactNode;
};

export type SettingsToggleClassNames = {
  container?: string;
  label?: string;
  description?: string;
  children?: string;
};

export type InputClassNames = {
  container?: string;
  label?: string;
  input?: string;
  addOn?: string;
};
export type CheckboxClassNames = {
  checkbox?: string;
  description?: string;
  container?: string;
};
export type SelectClassNames = {
  innerClassNames?: {
    input?: string;
    option?: string;
    control?: string;
    singleValue?: string;
    valueContainer?: string;
    multiValue?: string;
    menu?: string;
    menuList?: string;
  };
  select?: string;
  label?: string;
  container?: string;
};

export const EventTypeDuplicateInput = z
  .object({
    id: z.number(),
    slug: z.string(),
    title: z.string().min(1),
    description: z.string(),
    length: z.number(),
    teamId: z.number().nullish(),
  })
  .strict();

const calVideoSettingsSchema = z
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

export const createEventTypeInput = z
  .object({
    title: z.string().trim().min(1),
    slug: eventTypeSlug,
    description: z.string().nullish(),
    length: z.number().int(),
    hidden: z.boolean(),
    teamId: z.number().int().nullish(),
    schedulingType: z.nativeEnum(SchedulingType).nullish(),
    locations: eventTypeLocations,
    metadata: EventTypeMetaDataSchema.optional(),
    disableGuests: z.boolean().optional(),
    slotInterval: z.number().min(0).nullish(),
    minimumBookingNotice: z.number().int().min(0).optional(),
    beforeEventBuffer: z.number().int().min(0).optional(),
    afterEventBuffer: z.number().int().min(0).optional(),
    scheduleId: z.number().int().optional(),
    calVideoSettings: calVideoSettingsSchema,
  })
  .partial({ hidden: true, locations: true })
  .refine((data) => (data.teamId ? data.teamId && data.schedulingType : true), {
    path: ["schedulingType"],
    message: "You must select a scheduling type for team events",
  });

export type FormValidationResult = {
  isValid: boolean;
  errors: Record<string, unknown>;
};

export interface EventTypePlatformWrapperRef {
  validateForm: () => Promise<FormValidationResult>;
  handleFormSubmit: (callbacks?: { onSuccess?: () => void; onError?: (error: Error) => void }) => void;
}

export interface CalVideoSettings {
  disableRecordingForOrganizer?: boolean;
  disableRecordingForGuests?: boolean;
  enableAutomaticTranscription?: boolean;
  enableAutomaticRecordingForOrganizer?: boolean;
  disableTranscriptionForGuests?: boolean;
  disableTranscriptionForOrganizer?: boolean;
  redirectUrlOnExit?: string;
  requireEmailForGuests?: boolean;
}
