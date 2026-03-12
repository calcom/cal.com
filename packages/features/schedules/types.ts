export type ScheduleClassNames = {
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

/**
 * @deprecated Use `ScheduleClassNames` instead. This alias exists for backward compatibility.
 */
export type scheduleClassNames = ScheduleClassNames;
