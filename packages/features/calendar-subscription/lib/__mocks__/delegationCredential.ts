import { vi } from "vitest";

export const getCredentialForSelectedCalendar = vi.fn();

vi.mock("@calcom/app-store/delegationCredential", () => ({
  getCredentialForSelectedCalendar,
}));
