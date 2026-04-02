import { vi } from "vitest";

vi.mock("../AvailableTimeSlots", () => ({
  AvailableTimeSlots: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="available-time-slots">{children}</div>
  ),
}));
