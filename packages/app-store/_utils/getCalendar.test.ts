import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";

import type { CredentialForCalendarService } from "@calcom/types/Credential";

vi.mock("@calcom/features/flags/features.repository");
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
    checkIfUserHasFeature: ReturnType<typeof vi.fn>;
    checkIfTeamHasFeatureDirect: ReturnType<typeof vi.fn>;
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

  const mockTeamCredential: CredentialForCalendarService = {
    id: 2,
    type: "google_calendar",
    key: { access_token: "test-token" },
    userId: 123,
    teamId: 456,
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
      checkIfUserHasFeature: vi.fn(),
      checkIfTeamHasFeatureDirect: vi.fn(),
    };

    mockCalendarCacheWrapper = vi.fn().mockImplementation((config) => ({
      ...config.originalCalendar,
      __isCalendarCacheWrapper: true,
    }));

    mockCalendarCacheEventRepository = vi.fn().mockImplementation(() => ({
      __isMockRepository: true,
    }));

    const { FeaturesRepository } = await import("@calcom/features/flags/features.repository");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(FeaturesRepository).mockImplementation(() => mockFeaturesRepository as any);

    const { CalendarCacheWrapper } = await import(
      "@calcom/features/calendar-subscription/lib/cache/CalendarCacheWrapper"
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(CalendarCacheWrapper).mockImplementation(mockCalendarCacheWrapper as any);

    const { CalendarCacheEventRepository } = await import(
      "@calcom/features/calendar-subscription/lib/cache/CalendarCacheEventRepository"
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(CalendarCacheEventRepository).mockImplementation(mockCalendarCacheEventRepository as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test("should use CalendarCacheWrapper when all flags are enabled", async () => {
    mockFeaturesRepository.checkIfFeatureIsEnabledGlobally.mockResolvedValue(true);
    mockFeaturesRepository.checkIfUserHasFeature
      .mockResolvedValueOnce(true) // calendar-subscription-cache
      .mockResolvedValueOnce(true); // calendar-subscription-cache-read

    const { getCalendar } = await import("./getCalendar");
    const calendar = await getCalendar(mockCredential);

    expect(mockFeaturesRepository.checkIfFeatureIsEnabledGlobally).toHaveBeenCalledWith(
      "calendar-subscription-cache"
    );
    expect(mockFeaturesRepository.checkIfUserHasFeature).toHaveBeenCalledWith(
      123,
      "calendar-subscription-cache"
    );
    expect(mockFeaturesRepository.checkIfUserHasFeature).toHaveBeenCalledWith(
      123,
      "calendar-subscription-cache-read"
    );

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

  test("should NOT use CalendarCacheWrapper when calendar-subscription-cache-read is disabled", async () => {
    mockFeaturesRepository.checkIfFeatureIsEnabledGlobally.mockResolvedValue(true);
    mockFeaturesRepository.checkIfUserHasFeature
      .mockResolvedValueOnce(true) // calendar-subscription-cache
      .mockResolvedValueOnce(false); // calendar-subscription-cache-read (DISABLED)

    const { getCalendar } = await import("./getCalendar");
    const calendar = await getCalendar(mockCredential);

    expect(mockFeaturesRepository.checkIfFeatureIsEnabledGlobally).toHaveBeenCalledWith(
      "calendar-subscription-cache"
    );
    expect(mockFeaturesRepository.checkIfUserHasFeature).toHaveBeenCalledWith(
      123,
      "calendar-subscription-cache"
    );
    expect(mockFeaturesRepository.checkIfUserHasFeature).toHaveBeenCalledWith(
      123,
      "calendar-subscription-cache-read"
    );

    expect(mockCalendarCacheWrapper).not.toHaveBeenCalled();

    expect(calendar).toHaveProperty("__isMockCalendarService", true);
    expect(calendar).not.toHaveProperty("__isCalendarCacheWrapper");
  });

  test("should NOT use CalendarCacheWrapper when global cache flag is disabled", async () => {
    mockFeaturesRepository.checkIfFeatureIsEnabledGlobally.mockResolvedValue(false); // DISABLED
    mockFeaturesRepository.checkIfUserHasFeature
      .mockResolvedValueOnce(true) // calendar-subscription-cache
      .mockResolvedValueOnce(true); // calendar-subscription-cache-read

    const { getCalendar } = await import("./getCalendar");
    const calendar = await getCalendar(mockCredential);

    expect(mockFeaturesRepository.checkIfFeatureIsEnabledGlobally).toHaveBeenCalledWith(
      "calendar-subscription-cache"
    );
    expect(mockFeaturesRepository.checkIfUserHasFeature).toHaveBeenCalledWith(
      123,
      "calendar-subscription-cache"
    );
    expect(mockFeaturesRepository.checkIfUserHasFeature).toHaveBeenCalledWith(
      123,
      "calendar-subscription-cache-read"
    );

    expect(mockCalendarCacheWrapper).not.toHaveBeenCalled();

    expect(calendar).toHaveProperty("__isMockCalendarService", true);
    expect(calendar).not.toHaveProperty("__isCalendarCacheWrapper");
  });

  test("should NOT use CalendarCacheWrapper when user cache flag is disabled", async () => {
    mockFeaturesRepository.checkIfFeatureIsEnabledGlobally.mockResolvedValue(true);
    mockFeaturesRepository.checkIfUserHasFeature
      .mockResolvedValueOnce(false) // calendar-subscription-cache (DISABLED)
      .mockResolvedValueOnce(true); // calendar-subscription-cache-read

    const { getCalendar } = await import("./getCalendar");
    const calendar = await getCalendar(mockCredential);

    expect(mockFeaturesRepository.checkIfFeatureIsEnabledGlobally).toHaveBeenCalledWith(
      "calendar-subscription-cache"
    );
    expect(mockFeaturesRepository.checkIfUserHasFeature).toHaveBeenCalledWith(
      123,
      "calendar-subscription-cache"
    );
    expect(mockFeaturesRepository.checkIfUserHasFeature).toHaveBeenCalledWith(
      123,
      "calendar-subscription-cache-read"
    );

    expect(mockCalendarCacheWrapper).not.toHaveBeenCalled();

    expect(calendar).toHaveProperty("__isMockCalendarService", true);
    expect(calendar).not.toHaveProperty("__isCalendarCacheWrapper");
  });

  test("should return null for null credential", async () => {
    const { getCalendar } = await import("./getCalendar");
    const calendar = await getCalendar(null);

    expect(calendar).toBeNull();
    expect(mockFeaturesRepository.checkIfFeatureIsEnabledGlobally).not.toHaveBeenCalled();
    expect(mockFeaturesRepository.checkIfUserHasFeature).not.toHaveBeenCalled();
  });

  test("should return null for credential without key", async () => {
    const credentialWithoutKey = {
      ...mockCredential,
      key: null,
    };

    const { getCalendar } = await import("./getCalendar");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const calendar = await getCalendar(credentialWithoutKey as any);

    expect(calendar).toBeNull();
    expect(mockFeaturesRepository.checkIfFeatureIsEnabledGlobally).not.toHaveBeenCalled();
    expect(mockFeaturesRepository.checkIfUserHasFeature).not.toHaveBeenCalled();
  });

  test("should use team-specific check for team credentials when all flags are enabled", async () => {
    mockFeaturesRepository.checkIfFeatureIsEnabledGlobally.mockResolvedValue(true);
    mockFeaturesRepository.checkIfTeamHasFeatureDirect
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true);

    const { getCalendar } = await import("./getCalendar");
    const calendar = await getCalendar(mockTeamCredential);

    expect(mockFeaturesRepository.checkIfFeatureIsEnabledGlobally).toHaveBeenCalledWith(
      "calendar-subscription-cache"
    );
    expect(mockFeaturesRepository.checkIfTeamHasFeatureDirect).toHaveBeenCalledWith(
      456,
      "calendar-subscription-cache"
    );
    expect(mockFeaturesRepository.checkIfTeamHasFeatureDirect).toHaveBeenCalledWith(
      456,
      "calendar-subscription-cache-read"
    );
    expect(mockFeaturesRepository.checkIfUserHasFeature).not.toHaveBeenCalled();

    expect(mockCalendarCacheWrapper).toHaveBeenCalledTimes(1);
    expect(calendar).toHaveProperty("__isCalendarCacheWrapper", true);
  });

  test("should NOT use cache for team credential when team read flag is disabled", async () => {
    mockFeaturesRepository.checkIfFeatureIsEnabledGlobally.mockResolvedValue(true);
    mockFeaturesRepository.checkIfTeamHasFeatureDirect
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);

    const { getCalendar } = await import("./getCalendar");
    const calendar = await getCalendar(mockTeamCredential);

    expect(mockFeaturesRepository.checkIfTeamHasFeatureDirect).toHaveBeenCalledWith(
      456,
      "calendar-subscription-cache"
    );
    expect(mockFeaturesRepository.checkIfTeamHasFeatureDirect).toHaveBeenCalledWith(
      456,
      "calendar-subscription-cache-read"
    );
    expect(mockFeaturesRepository.checkIfUserHasFeature).not.toHaveBeenCalled();

    expect(mockCalendarCacheWrapper).not.toHaveBeenCalled();
    expect(calendar).toHaveProperty("__isMockCalendarService", true);
    expect(calendar).not.toHaveProperty("__isCalendarCacheWrapper");
  });

  test("should NOT use cache for team credential when team cache flag is disabled", async () => {
    mockFeaturesRepository.checkIfFeatureIsEnabledGlobally.mockResolvedValue(true);
    mockFeaturesRepository.checkIfTeamHasFeatureDirect
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);

    const { getCalendar } = await import("./getCalendar");
    const calendar = await getCalendar(mockTeamCredential);

    expect(mockFeaturesRepository.checkIfTeamHasFeatureDirect).toHaveBeenCalledWith(
      456,
      "calendar-subscription-cache"
    );
    expect(mockFeaturesRepository.checkIfTeamHasFeatureDirect).toHaveBeenCalledWith(
      456,
      "calendar-subscription-cache-read"
    );
    expect(mockFeaturesRepository.checkIfUserHasFeature).not.toHaveBeenCalled();

    expect(mockCalendarCacheWrapper).not.toHaveBeenCalled();
    expect(calendar).toHaveProperty("__isMockCalendarService", true);
    expect(calendar).not.toHaveProperty("__isCalendarCacheWrapper");
  });
});
