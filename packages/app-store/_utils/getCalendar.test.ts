import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";

import type { CredentialForCalendarService } from "@calcom/types/Credential";

vi.mock("@calcom/features/flags/features.repository");
vi.mock("@calcom/lib/server/repository/SelectedCalendarRepository");
vi.mock("@calcom/features/calendar-subscription/lib/cache/CalendarCacheWrapper");
vi.mock("@calcom/features/calendar-subscription/lib/cache/CalendarCacheEventRepository");
vi.mock("@calcom/prisma", () => ({
  prisma: {},
}));

vi.mock("../calendar.services.generated", () => ({
  CalendarServiceMap: {
    googlecalendar: Promise.resolve({
      default: vi.fn().mockImplementation((credential) => ({
        credential,
        __isMockCalendarService: true,
      })),
    }),
  },
}));

describe("getCalendar", () => {
  let mockFeaturesRepository: {
    checkIfFeatureIsEnabledGlobally: ReturnType<typeof vi.fn>;
  };

  let mockSelectedCalendarRepository: {
    isCacheReadyForCredential: ReturnType<typeof vi.fn>;
  };

  let mockCalendarCacheWrapper: ReturnType<typeof vi.fn>;
  let mockCalendarCacheEventRepository: ReturnType<typeof vi.fn>;

  const mockCredential: CredentialForCalendarService = {
    id: 1,
    type: "google_calendar",
    key: { access_token: "test-token" },
    userId: 123,
    teamId: null,
    appId: "google-calendar",
    invalid: false,
    user: {
      email: "test@example.com",
    },
  };

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();

    mockFeaturesRepository = {
      checkIfFeatureIsEnabledGlobally: vi.fn(),
    };

    mockSelectedCalendarRepository = {
      isCacheReadyForCredential: vi.fn(),
    };

    mockCalendarCacheWrapper = vi.fn().mockImplementation((config) => ({
      ...config.originalCalendar,
      __isCalendarCacheWrapper: true,
    }));

    mockCalendarCacheEventRepository = vi.fn().mockImplementation(() => ({
      __isMockRepository: true,
    }));

    const { FeaturesRepository } = await import("@calcom/features/flags/features.repository");
    vi.mocked(FeaturesRepository).mockImplementation(
      () => mockFeaturesRepository as unknown as InstanceType<typeof FeaturesRepository>
    );

    const { SelectedCalendarRepository } = await import(
      "@calcom/lib/server/repository/SelectedCalendarRepository"
    );
    vi.mocked(SelectedCalendarRepository).mockImplementation(
      () => mockSelectedCalendarRepository as unknown as InstanceType<typeof SelectedCalendarRepository>
    );

    const { CalendarCacheWrapper } = await import(
      "@calcom/features/calendar-subscription/lib/cache/CalendarCacheWrapper"
    );
    vi.mocked(CalendarCacheWrapper).mockImplementation(
      mockCalendarCacheWrapper as unknown as typeof CalendarCacheWrapper
    );

    const { CalendarCacheEventRepository } = await import(
      "@calcom/features/calendar-subscription/lib/cache/CalendarCacheEventRepository"
    );
    vi.mocked(CalendarCacheEventRepository).mockImplementation(
      mockCalendarCacheEventRepository as unknown as typeof CalendarCacheEventRepository
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test("should use CalendarCacheWrapper when global flag is enabled and cache is ready", async () => {
    mockFeaturesRepository.checkIfFeatureIsEnabledGlobally.mockResolvedValue(true);
    mockSelectedCalendarRepository.isCacheReadyForCredential.mockResolvedValue(true);

    const { getCalendar } = await import("./getCalendar");
    const calendar = await getCalendar(mockCredential);

    expect(mockFeaturesRepository.checkIfFeatureIsEnabledGlobally).toHaveBeenCalledWith(
      "calendar-subscription-cache"
    );
    expect(mockSelectedCalendarRepository.isCacheReadyForCredential).toHaveBeenCalledWith(1);

    expect(mockCalendarCacheWrapper).toHaveBeenCalledTimes(1);
    expect(mockCalendarCacheWrapper).toHaveBeenCalledWith(
      expect.objectContaining({
        originalCalendar: expect.objectContaining({
          __isMockCalendarService: true,
        }),
        calendarCacheEventRepository: expect.objectContaining({
          __isMockRepository: true,
        }),
      })
    );

    expect(calendar).toHaveProperty("__isCalendarCacheWrapper", true);
  });

  test("should NOT use CalendarCacheWrapper when cache is not ready", async () => {
    mockFeaturesRepository.checkIfFeatureIsEnabledGlobally.mockResolvedValue(true);
    mockSelectedCalendarRepository.isCacheReadyForCredential.mockResolvedValue(false);

    const { getCalendar } = await import("./getCalendar");
    const calendar = await getCalendar(mockCredential);

    expect(mockFeaturesRepository.checkIfFeatureIsEnabledGlobally).toHaveBeenCalledWith(
      "calendar-subscription-cache"
    );
    expect(mockSelectedCalendarRepository.isCacheReadyForCredential).toHaveBeenCalledWith(1);

    expect(mockCalendarCacheWrapper).not.toHaveBeenCalled();

    expect(calendar).toHaveProperty("__isMockCalendarService", true);
    expect(calendar).not.toHaveProperty("__isCalendarCacheWrapper");
  });

  test("should NOT use CalendarCacheWrapper when global cache flag is disabled", async () => {
    mockFeaturesRepository.checkIfFeatureIsEnabledGlobally.mockResolvedValue(false);
    mockSelectedCalendarRepository.isCacheReadyForCredential.mockResolvedValue(true);

    const { getCalendar } = await import("./getCalendar");
    const calendar = await getCalendar(mockCredential);

    expect(mockFeaturesRepository.checkIfFeatureIsEnabledGlobally).toHaveBeenCalledWith(
      "calendar-subscription-cache"
    );
    expect(mockSelectedCalendarRepository.isCacheReadyForCredential).toHaveBeenCalledWith(1);

    expect(mockCalendarCacheWrapper).not.toHaveBeenCalled();

    expect(calendar).toHaveProperty("__isMockCalendarService", true);
    expect(calendar).not.toHaveProperty("__isCalendarCacheWrapper");
  });

  test("should return null for null credential", async () => {
    const { getCalendar } = await import("./getCalendar");
    const calendar = await getCalendar(null);

    expect(calendar).toBeNull();
    expect(mockFeaturesRepository.checkIfFeatureIsEnabledGlobally).not.toHaveBeenCalled();
    expect(mockSelectedCalendarRepository.isCacheReadyForCredential).not.toHaveBeenCalled();
  });

  test("should return null for credential without key", async () => {
    const credentialWithoutKey = {
      ...mockCredential,
      key: null,
    };

    const { getCalendar } = await import("./getCalendar");
    const calendar = await getCalendar(credentialWithoutKey as unknown as CredentialForCalendarService);

    expect(calendar).toBeNull();
    expect(mockFeaturesRepository.checkIfFeatureIsEnabledGlobally).not.toHaveBeenCalled();
    expect(mockSelectedCalendarRepository.isCacheReadyForCredential).not.toHaveBeenCalled();
  });
});
