import { vi } from "vitest";

export const CredentialRepository = {
  findCredentialForCalendarServiceById: vi.fn().mockResolvedValue({
    id: 1,
    type: "google_calendar",
    key: { access_token: "test" },
    userId: 1,
    teamId: null,
    appId: "google",
    invalid: false,
    user: { email: "test@example.com" },
  }),
}; 