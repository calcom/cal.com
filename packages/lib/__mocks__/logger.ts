import { vi } from "vitest";

const mockLogger = {
  getSubLogger: () => ({
    debug: vi.fn(),
    error: vi.fn(),
    log: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  }),
  debug: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  log: vi.fn(),
  warn: vi.fn(),
};

vi.mock("@calcom/lib/logger", () => ({
  default: mockLogger,
}));

export default mockLogger;
