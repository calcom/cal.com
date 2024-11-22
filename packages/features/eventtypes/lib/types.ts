import type { z } from "zod";

import type { EventLocationType } from "@calcom/core/location";
import type { ChildrenEventType } from "@calcom/features/eventtypes/components/ChildrenEventTypeSelect";
import type { AttributesQueryValue } from "@calcom/lib/raqb/types";
import type { EventTypeTranslation } from "@calcom/prisma/client";
import type { PeriodType, SchedulingType } from "@calcom/prisma/enums";
import type { BookerLayoutSettings, EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";
import type { customInputSchema } from "@calcom/prisma/zod-utils";
import type { eventTypeBookingFields } from "@calcom/prisma/zod-utils";
import type { eventTypeColor } from "@calcom/prisma/zod-utils";
import type { RouterOutputs, RouterInputs } from "@calcom/trpc/react";
import type { IntervalLimit, RecurringEvent } from "@calcom/types/Calendar";

export type CustomInputParsed = typeof customInputSchema._output;

export type AvailabilityOption = {
  label: string;
  value: number;
  isDefault: boolean;
  isManaged?: boolean;
};
export type EventTypeSetupProps = RouterOutputs["viewer"]["eventTypes"]["get"];
export type EventTypeSetup = RouterOutputs["viewer"]["eventTypes"]["get"]["eventType"];
export type EventTypeApps = RouterOutputs["viewer"]["integrations"];
export type Host = {
  isFixed: boolean;
  userId: number;
  priority: number;
  weight: number;
  scheduleId?: number | null;
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

export type FormValues = {
  id: number;
  title: string;
  eventTitle: string;
  eventName: string;
  slug: string;
  isInstantEvent: boolean;
  instantMeetingParameters: string[];
  instantMeetingExpiryTimeOffsetInSeconds: number;
  length: number;
  offsetStart: number;
  description: string;
  disableGuests: boolean;
  lockTimeZoneToggleOnBookingPage: boolean;
  requiresConfirmation: boolean;
  requiresConfirmationWillBlockSlot: boolean;
  requiresBookerEmailVerification: boolean;
  recurringEvent: RecurringEvent | null;
  schedulingType: SchedulingType | null;
  hidden: boolean;
  hideCalendarNotes: boolean;
  multiplePrivateLinks: string[] | undefined;
  eventTypeColor: z.infer<typeof eventTypeColor>;
  locations: EventLocation[];
  aiPhoneCallConfig: PhoneCallConfig;
  customInputs: CustomInputParsed[];
  schedule: number | null;

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
  fieldTranslations: EventTypeTranslation[];
  scheduleName: string;
  minimumBookingNotice: number;
  minimumBookingNoticeInDurationType: number;
  beforeEventBuffer: number;
  afterEventBuffer: number;
  slotInterval: number | null;
  metadata: z.infer<typeof EventTypeMetaDataSchema>;
  destinationCalendar: {
    integration: string;
    externalId: string;
  };
  successRedirectUrl: string;
  durationLimits?: IntervalLimit;
  bookingLimits?: IntervalLimit;
  onlyShowFirstAvailableSlot: boolean;
  children: ChildrenEventType[];
  hosts: Host[];
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
};

export type LocationFormValues = Pick<FormValues, "id" | "locations" | "bookingFields" | "seatsPerTimeSlot">;

export type EventTypeAssignedUsers = RouterOutputs["viewer"]["eventTypes"]["get"]["eventType"]["children"];
export type EventTypeHosts = RouterOutputs["viewer"]["eventTypes"]["get"]["eventType"]["hosts"];
export type EventTypeUpdateInput = RouterInputs["viewer"]["eventTypes"]["update"];
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
