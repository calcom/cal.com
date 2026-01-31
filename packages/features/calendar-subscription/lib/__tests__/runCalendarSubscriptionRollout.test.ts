import { describe, test, expect, beforeEach, vi } from "vitest";

import { runCalendarSubscriptionRollout } from "../runCalendarSubscriptionRollout";

const mockCalendarSubscriptionServiceFactory = vi.fn();

vi.mock("@calcom/features/bookings/repositories/BookingRepository", () => ({
  BookingRepository: vi.fn().mockImplementation(function BookingRepositoryMock() {
    return {};
  }),
}));
vi.mock("@calcom/features/calendar-subscription/adapters/AdaptersFactory", () => ({
  DefaultAdapterFactory: vi.fn().mockImplementation(function AdapterFactoryMock() {
    return {};
  }),
}));
vi.mock("@calcom/features/calendar-subscription/lib/cache/CalendarCacheEventRepository", () => ({
  CalendarCacheEventRepository: vi.fn().mockImplementation(function CalendarCacheEventRepositoryMock() {
    return {};
  }),
}));
vi.mock("@calcom/features/calendar-subscription/lib/cache/CalendarCacheEventService", () => ({
  CalendarCacheEventService: vi.fn().mockImplementation(function CalendarCacheEventServiceMock() {
    return {};
  }),
}));
vi.mock("@calcom/features/calendar-subscription/lib/sync/CalendarSyncService", () => ({
  CalendarSyncService: vi.fn().mockImplementation(function CalendarSyncServiceMock() {
    return {};
  }),
}));
vi.mock("@calcom/features/flags/features.repository", () => ({
  FeaturesRepository: vi.fn().mockImplementation(function FeaturesRepositoryMock() {
    return {};
  }),
}));
vi.mock("@calcom/features/selectedCalendar/repositories/SelectedCalendarRepository", () => ({
  SelectedCalendarRepository: vi.fn().mockImplementation(function SelectedCalendarRepositoryMock() {
    return {};
  }),
}));
vi.mock("@calcom/features/calendar-subscription/lib/CalendarSubscriptionService", () => ({
  CalendarSubscriptionService: vi.fn().mockImplementation(function CalendarSubscriptionServiceMock(...args: unknown[]) {
    return mockCalendarSubscriptionServiceFactory(...args);
  }),
}));
vi.mock("@calcom/prisma", () => ({
  prisma: {},
}));

describe("runCalendarSubscriptionRollout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCalendarSubscriptionServiceFactory.mockReset();
  });

  test("skips rollout when cache and sync features are disabled", async () => {
    const isCacheEnabled = vi.fn().mockResolvedValue(false);
    const isSyncEnabled = vi.fn().mockResolvedValue(false);
    const checkForNewSubscriptions = vi.fn();

    mockCalendarSubscriptionServiceFactory.mockReturnValue({
      isCacheEnabled,
      isSyncEnabled,
      checkForNewSubscriptions,
    });

    const result = await runCalendarSubscriptionRollout();

    expect(result.skipped).toBe(true);
    expect(checkForNewSubscriptions).not.toHaveBeenCalled();
  });

  test("runs rollout when at least one feature is enabled", async () => {
    const isCacheEnabled = vi.fn().mockResolvedValue(true);
    const isSyncEnabled = vi.fn().mockResolvedValue(false);
    const checkForNewSubscriptions = vi.fn().mockResolvedValue(undefined);

    mockCalendarSubscriptionServiceFactory.mockReturnValue({
      isCacheEnabled,
      isSyncEnabled,
      checkForNewSubscriptions,
    });

    const result = await runCalendarSubscriptionRollout();

    expect(result.skipped).toBe(false);
    expect(checkForNewSubscriptions).toHaveBeenCalledOnce();
  });

  test("propagates errors from the subscription service", async () => {
    const isCacheEnabled = vi.fn().mockResolvedValue(true);
    const isSyncEnabled = vi.fn().mockResolvedValue(true);
    const checkForNewSubscriptions = vi.fn().mockRejectedValue(new Error("Service failure"));

    mockCalendarSubscriptionServiceFactory.mockReturnValue({
      isCacheEnabled,
      isSyncEnabled,
      checkForNewSubscriptions,
    });

    await expect(runCalendarSubscriptionRollout()).rejects.toThrow("Service failure");
  });
});
