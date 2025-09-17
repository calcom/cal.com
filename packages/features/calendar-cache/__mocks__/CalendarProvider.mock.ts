import { vi } from "vitest";

import type { Calendar } from "@calcom/types/Calendar";

export const createMockCalendarProvider = (overrides: Partial<Calendar> = {}): Calendar =>
  ({
    getCredentialId: vi.fn().mockReturnValue(1),
    watchCalendar: vi.fn().mockResolvedValue(undefined),
    unwatchCalendar: vi.fn().mockResolvedValue(undefined),
    getAvailability: vi.fn().mockResolvedValue([]),
    createEvent: vi.fn().mockResolvedValue({ id: "mock-event-id" }),
    updateEvent: vi.fn().mockResolvedValue({ id: "mock-event-id" }),
    deleteEvent: vi.fn().mockResolvedValue(undefined),
    getAllCalendars: vi.fn().mockResolvedValue([]),
    listCalendars: vi.fn().mockResolvedValue([]),
    ...overrides,
  } as Calendar);

export const mockGoogleCalendarProvider = createMockCalendarProvider({
  getCredentialId: vi.fn().mockReturnValue(1),
});

export const mockOffice365CalendarProvider = createMockCalendarProvider({
  getCredentialId: vi.fn().mockReturnValue(2),
});
