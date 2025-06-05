export type CancellationBySyncReason =
  | "event_declined_by_organizer_in_calendar"
  | "event_cancelled_in_calendar";

export type RescheduleBySyncReason = "event_time_changed_in_calendar";
