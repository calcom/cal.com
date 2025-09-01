export interface ICalendarTasker {
  createEvent(payload: { name: string }): Promise<{ runId: string }>;
  updateEvent(payload: { surname: string }): Promise<{ runId: string }>;
}
