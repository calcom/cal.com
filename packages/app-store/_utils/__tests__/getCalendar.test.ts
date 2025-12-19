import { describe, test, expect, vi, beforeEach } from "vitest";

import type { Calendar } from "@calcom/types/Calendar";
import type { CredentialForCalendarService } from "@calcom/types/Credential";

// Type for test results that may include wrapper markers
interface TestCalendarResult extends Calendar {
  __isCacheWrapper?: boolean;
  __isBatchWrapper?: boolean;
}

// Type for mock delegation credential - matches CredentialForCalendarService.delegatedTo
interface MockDelegationCredential {
  id?: string;
  serviceAccountKey: {
    client_email?: string;
    tenant_id?: string;
    client_id: string;
    private_key: string;
  };
}

// Type for mock features repository
interface MockFeaturesRepository {
  checkIfFeatureIsEnabledGlobally: ReturnType<typeof vi.fn>;
  checkIfUserHasFeatureNonHierarchical: ReturnType<typeof vi.fn>;
}

// Mock the dependencies before importing the module under test
vi.mock("@calcom/prisma", () => ({
  prisma: {},
}));

vi.mock("@calcom/features/flags/features.repository", () => ({
  FeaturesRepository: vi.fn().mockImplementation(() => ({
    checkIfFeatureIsEnabledGlobally: vi.fn().mockResolvedValue(false),
    checkIfUserHasFeatureNonHierarchical: vi.fn().mockResolvedValue(false),
  })),
}));

vi.mock("@calcom/features/calendar-subscription/lib/CalendarSubscriptionService", () => ({
  CalendarSubscriptionService: {
    CALENDAR_SUBSCRIPTION_CACHE_FEATURE: "calendar-subscription-cache",
  },
}));

vi.mock("@calcom/features/calendar-subscription/lib/cache/CalendarCacheEventRepository", () => ({
  CalendarCacheEventRepository: vi.fn().mockImplementation(() => ({})),
}));

vi.mock("@calcom/features/calendar-subscription/lib/cache/CalendarCacheEventService", () => ({
  CalendarCacheEventService: {
    isCalendarTypeSupported: vi.fn().mockReturnValue(false),
  },
}));

vi.mock("@calcom/features/calendar-subscription/lib/cache/CalendarCacheWrapper", () => ({
  CalendarCacheWrapper: vi.fn().mockImplementation(({ originalCalendar }) => ({
    ...originalCalendar,
    __isCacheWrapper: true,
  })),
}));

vi.mock("@calcom/features/calendar-batch/lib/CalendarBatchService", () => ({
  CalendarBatchService: {
    isSupported: vi.fn().mockReturnValue(false),
  },
}));

vi.mock("@calcom/features/calendar-batch/lib/CalendarBatchWrapper", () => ({
  CalendarBatchWrapper: vi.fn().mockImplementation(({ originalCalendar }) => ({
    ...originalCalendar,
    __isBatchWrapper: true,
  })),
}));

vi.mock("@calcom/lib/logger", () => ({
  default: {
    getSubLogger: () => ({
      warn: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
    }),
  },
}));

// Mock the CalendarServiceMap
vi.mock("../../calendar.services.generated", () => ({
  CalendarServiceMap: {
    googlecalendar: Promise.resolve({
      default: vi.fn().mockImplementation(() => createMockCalendar()),
    }),
    office365calendar: Promise.resolve({
      default: vi.fn().mockImplementation(() => createMockCalendar()),
    }),
  },
}));

// Import after mocks are set up
import { CalendarCacheEventService } from "@calcom/features/calendar-subscription/lib/cache/CalendarCacheEventService";
import { CalendarBatchService } from "@calcom/features/calendar-batch/lib/CalendarBatchService";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { CalendarCacheWrapper } from "@calcom/features/calendar-subscription/lib/cache/CalendarCacheWrapper";
import { CalendarBatchWrapper } from "@calcom/features/calendar-batch/lib/CalendarBatchWrapper";

import { getCalendar } from "../getCalendar";

function createMockCalendar(): Calendar {
  return {
    getAvailability: vi.fn().mockResolvedValue([]),
    createEvent: vi.fn(),
    updateEvent: vi.fn(),
    deleteEvent: vi.fn(),
    listCalendars: vi.fn().mockResolvedValue([]),
  } as unknown as Calendar;
}

function createMockCredential(
  overrides: Partial<CredentialForCalendarService> & { delegatedTo?: MockDelegationCredential | null } = {}
): CredentialForCalendarService {
  return {
    id: 1,
    type: "google_calendar",
    key: { access_token: "test-token" },
    userId: 1,
    teamId: null,
    appId: "google-calendar",
    invalid: false,
    delegatedTo: null,
    ...overrides,
  } as CredentialForCalendarService;
}

describe("getCalendar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("resolveCalendarServeStrategy", () => {
    test("should return CalendarCacheWrapper when cache is supported and enabled", async () => {
      const mockCredential = createMockCredential({ type: "google_calendar" });

      // Enable cache support
      vi.mocked(CalendarCacheEventService.isCalendarTypeSupported).mockReturnValue(true);
      vi.mocked(CalendarBatchService.isSupported).mockReturnValue(false);

      const result = (await getCalendar(mockCredential, true)) as TestCalendarResult;

      expect(result).toBeDefined();
      expect(result.__isCacheWrapper).toBe(true);
      expect(CalendarCacheWrapper).toHaveBeenCalled();
    });

    test("should return CalendarBatchWrapper when cache is not supported but batch is supported", async () => {
      const mockCredential = createMockCredential({
        type: "google_calendar",
        delegatedTo: {
          id: "delegation-1",
          serviceAccountKey: { client_id: "test-client-id", private_key: "test-private-key" },
        },
      });

      // Disable cache, enable batch
      vi.mocked(CalendarCacheEventService.isCalendarTypeSupported).mockReturnValue(false);
      vi.mocked(CalendarBatchService.isSupported).mockReturnValue(true);

      const result = (await getCalendar(mockCredential, false)) as TestCalendarResult;

      expect(result).toBeDefined();
      expect(result.__isBatchWrapper).toBe(true);
      expect(CalendarBatchWrapper).toHaveBeenCalled();
    });

    test("should return CalendarBatchWrapper when cache is supported but explicitly disabled", async () => {
      const mockCredential = createMockCredential({
        type: "google_calendar",
        delegatedTo: {
          id: "delegation-1",
          serviceAccountKey: { client_id: "test-client-id", private_key: "test-private-key" },
        },
      });

      // Cache supported but disabled via shouldServeCache=false, batch enabled
      vi.mocked(CalendarCacheEventService.isCalendarTypeSupported).mockReturnValue(true);
      vi.mocked(CalendarBatchService.isSupported).mockReturnValue(true);

      const result = (await getCalendar(mockCredential, false)) as TestCalendarResult;

      expect(result).toBeDefined();
      expect(result.__isBatchWrapper).toBe(true);
      expect(CalendarBatchWrapper).toHaveBeenCalled();
    });

    test("should return original calendar when neither cache nor batch is supported", async () => {
      const mockCredential = createMockCredential({ type: "google_calendar" });

      // Disable both cache and batch
      vi.mocked(CalendarCacheEventService.isCalendarTypeSupported).mockReturnValue(false);
      vi.mocked(CalendarBatchService.isSupported).mockReturnValue(false);

      const result = (await getCalendar(mockCredential, false)) as TestCalendarResult;

      expect(result).toBeDefined();
      expect(result.__isCacheWrapper).toBeUndefined();
      expect(result.__isBatchWrapper).toBeUndefined();
    });

    test("should prioritize cache wrapper over batch wrapper when both are supported", async () => {
      const mockCredential = createMockCredential({
        type: "google_calendar",
        delegatedTo: {
          id: "delegation-1",
          serviceAccountKey: { client_id: "test-client-id", private_key: "test-private-key" },
        },
      });

      // Enable both cache and batch
      vi.mocked(CalendarCacheEventService.isCalendarTypeSupported).mockReturnValue(true);
      vi.mocked(CalendarBatchService.isSupported).mockReturnValue(true);

      const result = (await getCalendar(mockCredential, true)) as TestCalendarResult;

      expect(result).toBeDefined();
      // Cache should take precedence
      expect(result.__isCacheWrapper).toBe(true);
      expect(result.__isBatchWrapper).toBeUndefined();
    });

    test("should determine shouldServeCache from feature flags when not provided", async () => {
      const mockCredential = createMockCredential({ type: "google_calendar" });

      // Mock FeaturesRepository to return true for both checks
      const mockFeaturesRepository: MockFeaturesRepository = {
        checkIfFeatureIsEnabledGlobally: vi.fn().mockResolvedValue(true),
        checkIfUserHasFeatureNonHierarchical: vi.fn().mockResolvedValue(true),
      };
      vi.mocked(FeaturesRepository).mockImplementation(
        () => mockFeaturesRepository as unknown as InstanceType<typeof FeaturesRepository>
      );

      // Enable cache support
      vi.mocked(CalendarCacheEventService.isCalendarTypeSupported).mockReturnValue(true);
      vi.mocked(CalendarBatchService.isSupported).mockReturnValue(false);

      // Call without shouldServeCache parameter
      const result = await getCalendar(mockCredential);

      expect(result).toBeDefined();
      expect(mockFeaturesRepository.checkIfFeatureIsEnabledGlobally).toHaveBeenCalled();
      expect(mockFeaturesRepository.checkIfUserHasFeatureNonHierarchical).toHaveBeenCalledWith(
        mockCredential.userId,
        "calendar-subscription-cache"
      );
    });

    test("should not use cache when feature flag is disabled globally", async () => {
      const mockCredential = createMockCredential({ type: "google_calendar" });

      // Mock FeaturesRepository to return false for global check
      const mockFeaturesRepository: MockFeaturesRepository = {
        checkIfFeatureIsEnabledGlobally: vi.fn().mockResolvedValue(false),
        checkIfUserHasFeatureNonHierarchical: vi.fn().mockResolvedValue(true),
      };
      vi.mocked(FeaturesRepository).mockImplementation(
        () => mockFeaturesRepository as unknown as InstanceType<typeof FeaturesRepository>
      );

      // Enable cache support at service level
      vi.mocked(CalendarCacheEventService.isCalendarTypeSupported).mockReturnValue(true);
      vi.mocked(CalendarBatchService.isSupported).mockReturnValue(false);

      // Call without shouldServeCache parameter
      const result = (await getCalendar(mockCredential)) as TestCalendarResult;

      expect(result).toBeDefined();
      // Should not be cache wrapper because feature flag is disabled
      expect(result.__isCacheWrapper).toBeUndefined();
    });

    test("should not use cache when user does not have feature enabled", async () => {
      const mockCredential = createMockCredential({ type: "google_calendar" });

      // Mock FeaturesRepository to return true globally but false for user
      const mockFeaturesRepository: MockFeaturesRepository = {
        checkIfFeatureIsEnabledGlobally: vi.fn().mockResolvedValue(true),
        checkIfUserHasFeatureNonHierarchical: vi.fn().mockResolvedValue(false),
      };
      vi.mocked(FeaturesRepository).mockImplementation(
        () => mockFeaturesRepository as unknown as InstanceType<typeof FeaturesRepository>
      );

      // Enable cache support at service level
      vi.mocked(CalendarCacheEventService.isCalendarTypeSupported).mockReturnValue(true);
      vi.mocked(CalendarBatchService.isSupported).mockReturnValue(false);

      // Call without shouldServeCache parameter
      const result = (await getCalendar(mockCredential)) as TestCalendarResult;

      expect(result).toBeDefined();
      // Should not be cache wrapper because user doesn't have feature
      expect(result.__isCacheWrapper).toBeUndefined();
    });
  });

  describe("CalendarBatchService.isSupported integration", () => {
    test("should use batch wrapper for google_calendar with delegatedTo credential", async () => {
      const mockCredential = createMockCredential({
        type: "google_calendar",
        delegatedTo: {
          id: "delegation-credential-id",
          serviceAccountKey: {
            client_email: "test@test.iam.gserviceaccount.com",
            client_id: "test-client-id",
            private_key: "test-private-key",
          },
        },
      });

      // Disable cache, enable batch
      vi.mocked(CalendarCacheEventService.isCalendarTypeSupported).mockReturnValue(false);
      vi.mocked(CalendarBatchService.isSupported).mockReturnValue(true);

      const result = (await getCalendar(mockCredential, false)) as TestCalendarResult;

      expect(result).toBeDefined();
      expect(result.__isBatchWrapper).toBe(true);
      expect(CalendarBatchService.isSupported).toHaveBeenCalledWith(mockCredential);
    });

    test("should not use batch wrapper for google_calendar without delegatedTo credential", async () => {
      const mockCredential = createMockCredential({
        type: "google_calendar",
        delegatedTo: null,
      });

      // Disable cache, batch will return false for non-delegated
      vi.mocked(CalendarCacheEventService.isCalendarTypeSupported).mockReturnValue(false);
      vi.mocked(CalendarBatchService.isSupported).mockReturnValue(false);

      const result = (await getCalendar(mockCredential, false)) as TestCalendarResult;

      expect(result).toBeDefined();
      expect(result.__isBatchWrapper).toBeUndefined();
    });

    test("should not use batch wrapper for non-google calendar types", async () => {
      const mockCredential = createMockCredential({
        type: "office365_calendar",
        delegatedTo: {
          id: "delegation-1",
          serviceAccountKey: { client_id: "test-client-id", private_key: "test-private-key" },
        },
      });

      // Disable cache, batch returns false for non-google
      vi.mocked(CalendarCacheEventService.isCalendarTypeSupported).mockReturnValue(false);
      vi.mocked(CalendarBatchService.isSupported).mockReturnValue(false);

      const result = (await getCalendar(mockCredential, false)) as TestCalendarResult;

      expect(result).toBeDefined();
      expect(result.__isBatchWrapper).toBeUndefined();
    });
  });

  describe("edge cases", () => {
    test("should return null when credential is null", async () => {
      const result = await getCalendar(null);
      expect(result).toBeNull();
    });

    test("should return null when credential.key is missing", async () => {
      const mockCredential = createMockCredential();
      Object.assign(mockCredential, { key: null });

      const result = await getCalendar(mockCredential);
      expect(result).toBeNull();
    });

    test("should handle _other_calendar suffix in credential type", async () => {
      const mockCredential = createMockCredential({
        type: "google_calendar_other_calendar",
      });

      vi.mocked(CalendarCacheEventService.isCalendarTypeSupported).mockReturnValue(false);
      vi.mocked(CalendarBatchService.isSupported).mockReturnValue(false);

      const result = await getCalendar(mockCredential, false);

      // Should still work by stripping the suffix
      expect(result).toBeDefined();
    });

    test("should handle _crm suffix in credential type", async () => {
      const mockCredential = createMockCredential({
        type: "google_calendar_crm",
      });

      vi.mocked(CalendarCacheEventService.isCalendarTypeSupported).mockReturnValue(false);
      vi.mocked(CalendarBatchService.isSupported).mockReturnValue(false);

      const result = await getCalendar(mockCredential, false);

      // Should still work by stripping the suffix
      expect(result).toBeDefined();
    });
  });
});
