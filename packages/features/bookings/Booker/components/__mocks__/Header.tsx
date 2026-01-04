// Mock layout components
import type React from "react";
import { vi } from "vitest";

vi.mock("../Header", () => ({
  Header: ({ children }: { children: React.ReactNode }) => <div data-testid="header">{children}</div>,
}));
