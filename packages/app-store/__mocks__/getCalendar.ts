import { vi } from "vitest";

export const getCalendar = vi.fn().mockResolvedValue({
  createEvent: vi.fn().mockResolvedValue({
    uid: "calendar-uid",
    id: "calendar-uid",
    type: "google_calendar",
    password: "",
    url: "https://calendar.google.com/event",
    additionalInfo: {},
  }),
  updateEvent: vi.fn().mockResolvedValue({
    uid: "calendar-uid",
    id: "calendar-uid",
    type: "google_calendar",
    password: "",
    url: "https://calendar.google.com/event",
    additionalInfo: {},
  }),
  deleteEvent: vi.fn().mockResolvedValue({}),
}); 