import { SchedulingType, EventType, Availability } from "@prisma/client";

export type OpeningHours = Pick<Availability, "days" | "startTime" | "endTime">;
export type DateOverride = Pick<Availability, "date" | "startTime" | "endTime">;

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
  users?: {
    value: number;
    label: string;
    avatar: string;
  }[];
  availability?: { openingHours: OpeningHours[]; dateOverrides: DateOverride[] };
  customInputs?: EventTypeCustomInput[];
  timeZone: string;
  hidden: boolean;
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
  customInputs: EventTypeCustomInput[];
  timeZone: string;
  availability?: { openingHours: OpeningHours[]; dateOverrides: DateOverride[] };
};
