import type { UseFormReturn } from "react-hook-form";
import type { z } from "zod";

import type { EventLocationType } from "@calcom/core/location";
import type { ChildrenEventType } from "@calcom/features/eventtypes/components/ChildrenEventTypeSelect";
import type { SchedulingType, PeriodType } from "@calcom/prisma/enums";
import type { customInputSchema } from "@calcom/prisma/zod-utils";
import type { RecurringEvent } from "@calcom/types/Calendar";

export type CustomInputParsed = typeof customInputSchema._output;

export type FormValues = {
  title: string;
  eventTitle: string;
  eventName: string;
  slug: string;
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
  customInputs: CustomInputParsed[];
  schedule: number | null;
  periodType: PeriodType;
  periodDays: number;
  periodCountCalendarDays: "1" | "0";
  periodDates: { startDate: Date; endDate: Date };
  seatsPerTimeSlot: number | null;
  seatsShowAttendees: boolean | null;
  seatsShowAvailabilityCount: boolean | null;
  seatsPerTimeSlotEnabled: boolean;
  minimumBookingNotice: number;
  minimumBookingNoticeInDurationType: number;
  beforeBufferTime: number;
  afterBufferTime: number;
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
  hosts: { userId: number; isFixed: boolean }[];
  bookingFields: z.infer<typeof eventTypeBookingFields>;
  availability?: AvailabilityOption;
  bookerLayouts: BookerLayoutSettings;
  multipleDurationEnabled: boolean;
};

export type DestinationCalendar = {
  id: number;
  credentialId: number | null;
  userId: number | null;
  eventTypeId: number | null;
  integration: string;
  externalId: string;
};

export type Location = {
  type: string;
  address?: string | undefined;
  attendeeAddress?: string | undefined;
  link?: string | undefined;
  hostPhoneNumber?: string | undefined;
  displayLocationPublicly?: boolean | undefined;
  phone?: string | undefined;
  hostDefault?: string | undefined;
  credentialId?: number | undefined;
  teamName?: string | undefined;
};

export type Option = {
  label: string;
  value: string;
  disabled?: boolean | undefined;
  icon?: string | undefined;
  slug?: string | undefined;
};

export type AvailabilityOption = {
  label: string;
  value: number;
  isDefault: boolean;
  isManaged?: boolean;
};

export type DurationType = "minutes" | "hours" | "days";

export type IntervalLimitUnit = "day" | "week" | "month" | "year";

export type IntervalLimit = Partial<Record<`PER_${Uppercase<IntervalLimitUnit>}`, number | undefined>>;
export type IntervalLimitsKey = keyof IntervalLimit;

export type LimitsToggleProps = UseFormReturn<FormValues, any>;
