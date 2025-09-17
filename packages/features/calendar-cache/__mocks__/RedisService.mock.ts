import { vi } from "vitest";

export const createMockRedisService = () => ({
  get: vi.fn().mockResolvedValue(null),
  set: vi.fn().mockResolvedValue(undefined),
  del: vi.fn().mockResolvedValue(1),
});

export const mockRedisService = createMockRedisService();
