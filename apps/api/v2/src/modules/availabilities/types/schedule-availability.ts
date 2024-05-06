export class ScheduleAvailability {
  // note(Lauris): days example: [1, 2, 3, 4, 5] aka Monday to Friday, and 0 is Sunday and 6 is Saturday.
  days!: number[];
  startTime!: Date;
  endTime!: Date;
}
