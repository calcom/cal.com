import type { z } from "zod";

import type { EventLocationType } from "@calcom/core/location";
import type { ChildrenEventType } from "@calcom/features/eventtypes/components/ChildrenEventTypeSelect";
import type { PeriodType, SchedulingType } from "@calcom/prisma/enums";
import type { BookerLayoutSettings, EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";
import type { customInputSchema } from "@calcom/prisma/zod-utils";
import type { eventTypeBookingFields } from "@calcom/prisma/zod-utils";
import type { RouterOutputs } from "@calcom/trpc/react";
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
export type Host = { isFixed: boolean; userId: number; priority: number };
export type TeamMember = {
  value: string;
  label: string;
  avatar: string;
  email: string;
};

export type FormValues = {
  id: number;
  title: string;
  eventTitle: string;
  eventName: string;
  slug: string;
  isInstantEvent: boolean;
  instantMeetingExpiryTimeOffsetInSeconds: number;
  length: number;
  offsetStart: number;
  description: string;
  disableGuests: boolean;
  lockTimeZoneToggleOnBookingPage: boolean;
  requiresConfirmation: boolean;
  requiresBookerEmailVerification: boolean;
  recurringEvent: RecurringEvent | null;
  schedulingType: SchedulingType | null;
  hidden: boolean;
  hideCalendarNotes: boolean;
  hashedLink: string | undefined;
  locations: {
    type: EventLocationType["type"];
    address?: string;
    attendeeAddress?: string;
    link?: string;
    hostPhoneNumber?: string;
    displayLocationPublicly?: boolean;
    phone?: string;
    hostDefault?: string;
    credentialId?: number;
    teamName?: string;
  }[];
  aiPhoneCallConfig: {
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
  useEventTypeDestinationCalendarEmail: boolean;
  forwardParamsSuccessRedirect: boolean | null;
  secondaryEmailId?: number;
};

export type LocationFormValues = Pick<FormValues, "id" | "locations" | "bookingFields" | "seatsPerTimeSlot">;
