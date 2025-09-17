import { vi } from "vitest";

import type { ICalendarCacheEventRepository } from "../../../calendar-subscription/lib/cache/CalendarCacheEventRepository.interface";

export const createMockCalendarCacheEventRepository = (): ICalendarCacheEventRepository => ({
  upsertMany: vi.fn().mockResolvedValue(undefined),
  deleteMany: vi.fn().mockResolvedValue(undefined),
  deleteAllBySelectedCalendarId: vi.fn().mockResolvedValue(undefined),
  findAllBySelectedCalendarIds: vi.fn().mockResolvedValue([]),
});

export const mockCalendarCacheEventRepository = createMockCalendarCacheEventRepository();
