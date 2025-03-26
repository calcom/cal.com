import { vi } from "vitest";

const mockLogger = {
  debug: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  log: vi.fn(),
  warn: vi.fn(),
  getSubLogger: vi.fn(),
};

vi.mock("@calcom/lib/logger", () => ({
  default: mockLogger,
}));

export default mockLogger;
