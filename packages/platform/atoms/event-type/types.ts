import type { z } from "zod";

import type { EventLocationType } from "@calcom/core/location";
import type { ChildrenEventType } from "@calcom/features/eventtypes/components/ChildrenEventTypeSelect";
import type { SchedulingType, PeriodType } from "@calcom/prisma/enums";
import type { customInputSchema } from "@calcom/prisma/zod-utils";
import type { IntervalLimit, RecurringEvent } from "@calcom/types/Calendar";

import type { AvailabilityOption } from "../../../../apps/web/components/eventtype/EventAvailabilityTab";

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
