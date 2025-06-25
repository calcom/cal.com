import { vi } from "vitest";

export const createEvent = vi.fn().mockResolvedValue({
  appName: "google",
  type: "google_calendar",
  success: true,
  uid: "calendar-uid",
  createdEvent: {
    uid: "calendar-uid",
    id: "calendar-uid",
    type: "google_calendar",
    password: "",
    url: "https://calendar.google.com/event",
    additionalInfo: {},
  },
  originalEvent: {},
});

export const updateEvent = vi.fn().mockResolvedValue({
  appName: "google",
  type: "google_calendar",
  success: true,
  uid: "calendar-uid",
  updatedEvent: {
    uid: "calendar-uid",
    id: "calendar-uid",
    type: "google_calendar",
    password: "",
    url: "https://calendar.google.com/event",
    additionalInfo: {},
  },
  originalEvent: {},
});

export const deleteEvent = vi.fn(); 