import { vi } from "vitest";

export const getCredentialForSelectedCalendar = vi.fn().mockResolvedValue({
  id: 1,
  key: { access_token: "test-token" },
  user: { email: "test@example.com" },
  delegatedTo: null,
});

vi.doMock("@calcom/app-store/delegationCredential", () => ({
  getCredentialForSelectedCalendar,
}));
