import { vi } from "vitest";
// Mock layout components
vi.mock("../Header", () => ({
  Header: ({ children }: { children: React.ReactNode }) => <div data-testid="header">{children}</div>,
}));
