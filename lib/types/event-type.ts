export type OpeningHours = {
  days: number[];
  startTime: number;
  endTime: number;
};

export type DateOverride = {
  date: string;
  startTime: number;
  endTime: number;
};

export type AdvancedOptions = {
  eventName?: string;
  periodType?: string;
  periodDays?: number;
  periodStartDate?: Date | string;
  periodEndDate?: Date | string;
  periodCountCalendarDays?: boolean;
  requiresConfirmation?: boolean;
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
