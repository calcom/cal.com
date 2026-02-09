import { vi } from "vitest";

vi.mock("@calcom/features/bookings/components/Header", () => ({
  Header: ({ children }: { children: React.ReactNode }) => <div data-testid="header">{children}</div>,
}));
