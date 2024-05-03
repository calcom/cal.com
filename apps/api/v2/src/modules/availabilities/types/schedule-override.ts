export class ScheduleAvailability {
  // note(Lauris): date example: ISO8601 date 2024-05-25. The format is year-month-day.
  date!: string;
  // note(Lauris): startTime example: 09:00 aka format HH:MM
  startTime!: string;
  // note(Lauris): endTime example: 17:00 aka format HH:MM
  endTime!: string;
}
