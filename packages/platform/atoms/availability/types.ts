import type { Schedule as ScheduleType, TimeRange } from "@calcom/types/schedule";

export type Availability = {
  id: number;
  userId: number | null;
  eventTypeId: number | null;
  days: number[];
  startTime: string;
  endTime: Date;
  date: Date | null;
  scheduleId: number | null;
};

export type WeekdayFormat = "short" | "long";

export type AvailabilityFormValues = {
  name: string;
  schedule: ScheduleType;
  dateOverrides: { ranges: TimeRange[] }[];
  timeZone: string;
  isDefault: boolean;
};

export type scheduleClassNames = {
  schedule?: string;
  scheduleDay?: string;
  dayRanges?: string;
  timeRangeField?: string;
  labelAndSwitchContainer?: string;
  scheduleContainer?: string;
  timePicker?: {
    container?: string;
    valueContainer?: string;
    value?: string;
    input?: string;
    dropdown?: string;
  };
};

export type AvailabilityFormValidationResult = {
  isValid: boolean;
  errors: Record<string, unknown>;
};

export interface AvailabilitySettingsFormCallbacks {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export interface AvailabilitySettingsFormRef {
  validateForm: () => Promise<AvailabilityFormValidationResult>;
  handleFormSubmit: (callbacks?: AvailabilitySettingsFormCallbacks) => void;
}
