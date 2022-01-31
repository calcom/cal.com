import { EventType, SchedulingType } from "@prisma/client";
import { JSONObject } from "superjson/dist/types";

import { WorkingHours } from "./schedule";

export type AdvancedOptions = {
  metadata?: JSONObject;
  eventName?: string;
  periodType?: string;
  periodDays?: number;
  periodStartDate?: Date | string;
  periodEndDate?: Date | string;
  periodCountCalendarDays?: boolean;
  requiresConfirmation?: boolean;
  disableGuests?: boolean;
  minimumBookingNotice?: number;
  slotInterval?: number | null;
  price?: number;
  currency?: string;
  schedulingType?: SchedulingType;
  users?: string[];
  availability?: { openingHours: WorkingHours[]; dateOverrides: WorkingHours[] };
  customInputs?: EventTypeCustomInput[];
  timeZone?: string;
  destinationCalendar?: {
    userId?: number;
    eventTypeId?: number;
    integration: string;
    externalId: string;
  };
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
  teamId?: number;
  hidden: boolean;
  locations: unknown;
  availability?: { openingHours: WorkingHours[]; dateOverrides: WorkingHours[] };
};
