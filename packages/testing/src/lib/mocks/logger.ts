import { vi } from "vitest";

/**
 * Creates a mock logger for unit testing.
 *
 * All log methods are vi.fn() mocks that can be asserted on.
 *
 * @example
 * ```typescript
 * const mockLogger = createMockLogger();
 * const service = new SomeService(mockLogger);
 *
 * await service.doSomething();
 *
 * expect(mockLogger.info).toHaveBeenCalledWith("Something happened", { id: 123 });
 * ```
 */
export function createMockLogger(): MockLogger {
  const logger: MockLogger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    getSubLogger: vi.fn(),
  };

  // getSubLogger returns the same mock logger for chaining
  logger.getSubLogger.mockReturnValue(logger);

  return logger;
}

export type MockLogger = {
  debug: ReturnType<typeof vi.fn>;
  info: ReturnType<typeof vi.fn>;
  warn: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
  getSubLogger: ReturnType<typeof vi.fn>;
};
