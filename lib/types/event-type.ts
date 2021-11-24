import { EventType, SchedulingType } from "@prisma/client";

import { WorkingHours } from "./schedule";

export type AdvancedOptions = {
  eventName?: string;
  periodType?: string;
  periodDays?: number;
  periodStartDate?: Date | string;
  periodEndDate?: Date | string;
  periodCountCalendarDays?: boolean;
  requiresConfirmation?: boolean;
  disableGuests?: boolean;
  minimumBookingNotice?: number;
  price?: number;
  currency?: string;
  schedulingType?: SchedulingType;
  users?: string[];
  availability?: { openingHours: WorkingHours[]; dateOverrides: WorkingHours[] };
  customInputs?: EventTypeCustomInput[];
  timeZone?: string;
};

export type EventTypeCustomInput = {
  id: number;
  label: string;
  placeholder: string;
  required: boolean;
  type: string;
};

export type CreateEventType = {
  title: string;
  slug: string;
  description: string;
  length: number;
  teamId?: number;
  schedulingType?: SchedulingType;
};

export type CreateEventTypeResponse = {
  eventType: EventType;
};

export type EventTypeInput = AdvancedOptions & {
  id: number;
  title: string;
  slug: string;
  description: string;
  length: number;
  hidden: boolean;
  locations: unknown;
  availability?: { openingHours: WorkingHours[]; dateOverrides: WorkingHours[] };
};
