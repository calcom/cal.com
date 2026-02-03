import { vi } from "vitest";

export const CalendarAuth = vi.fn().mockImplementation(() => ({
  getClient: vi.fn().mockResolvedValue({
    events: {
      watch: vi.fn(),
      list: vi.fn(),
    },
    channels: {
      stop: vi.fn(),
    },
  }),
}));

vi.doMock("@calcom/app-store/googlecalendar/lib/CalendarAuth", () => ({
  CalendarAuth,
}));
