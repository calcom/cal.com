import prismock from "../../../tests/libs/__mocks__/prisma";

import { describe, expect, it, beforeEach, vi } from "vitest";

import type { Calendar } from "@calcom/types/Calendar";

import { CalendarCache } from "./calendar-cache";
import { CalendarCacheRepository } from "./calendar-cache.repository";
import { CalendarCacheRepositoryMock } from "./calendar-cache.repository.mock";

vi.mock("@calcom/features/flags/features.repository");
vi.mock("@calcom/lib/delegationCredential/server");
vi.mock("@calcom/app-store/_utils/getCalendar");

const mockCalendar: Calendar = {
  getCredentialId: () => 1,
} satisfies Partial<Calendar> as Calendar;

describe("CalendarCache", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismock.credential.deleteMany();
  });

  describe("init", () => {
    it("should return CalendarCacheRepository when feature is enabled", async () => {
      const { FeaturesRepository } = await import("@calcom/features/flags/features.repository");
      const mockFeaturesRepo = {
        checkIfFeatureIsEnabledGlobally: vi.fn().mockResolvedValue(true),
      };
      vi.mocked(FeaturesRepository).mockImplementation(() => mockFeaturesRepo);

      const result = await CalendarCache.init(mockCalendar);

      expect(result).toBeInstanceOf(CalendarCacheRepository);
      expect(mockFeaturesRepo.checkIfFeatureIsEnabledGlobally).toHaveBeenCalledWith("calendar-cache");
    });

    it("should return CalendarCacheRepositoryMock when feature is disabled", async () => {
      const { FeaturesRepository } = await import("@calcom/features/flags/features.repository");
      const mockFeaturesRepo = {
        checkIfFeatureIsEnabledGlobally: vi.fn().mockResolvedValue(false),
      };
      vi.mocked(FeaturesRepository).mockImplementation(() => mockFeaturesRepo);

      const result = await CalendarCache.init(mockCalendar);

      expect(result).toBeInstanceOf(CalendarCacheRepositoryMock);
      expect(mockFeaturesRepo.checkIfFeatureIsEnabledGlobally).toHaveBeenCalledWith("calendar-cache");
    });

    it("should handle null calendar", async () => {
      const { FeaturesRepository } = await import("@calcom/features/flags/features.repository");
      const mockFeaturesRepo = {
        checkIfFeatureIsEnabledGlobally: vi.fn().mockResolvedValue(true),
      };
      vi.mocked(FeaturesRepository).mockImplementation(() => mockFeaturesRepo);

      const result = await CalendarCache.init(null);

      expect(result).toBeInstanceOf(CalendarCacheRepository);
    });

    it("should handle feature repository errors", async () => {
      const { FeaturesRepository } = await import("@calcom/features/flags/features.repository");
      const mockFeaturesRepo = {
        checkIfFeatureIsEnabledGlobally: vi.fn().mockRejectedValue(new Error("Database error")),
      };
      vi.mocked(FeaturesRepository).mockImplementation(() => mockFeaturesRepo);

      await expect(CalendarCache.init(mockCalendar)).rejects.toThrow("Database error");
    });
  });

  describe("initFromCredentialId", () => {
    it("should initialize from credential ID", async () => {
      const credentialId = 123;
      const mockCredential = {
        id: credentialId,
        type: "google_calendar",
        key: { access_token: "token" },
        userId: 1,
      };

      const { getCredentialForCalendarCache } = await import("@calcom/lib/delegationCredential/server");
      const { getCalendar } = await import("@calcom/app-store/_utils/getCalendar");
      const { FeaturesRepository } = await import("@calcom/features/flags/features.repository");

      vi.mocked(getCredentialForCalendarCache).mockResolvedValue(mockCredential);
      vi.mocked(getCalendar).mockResolvedValue(mockCalendar);

      const mockFeaturesRepo = {
        checkIfFeatureIsEnabledGlobally: vi.fn().mockResolvedValue(true),
      };
      vi.mocked(FeaturesRepository).mockImplementation(() => mockFeaturesRepo);

      const result = await CalendarCache.initFromCredentialId(credentialId);

      expect(getCredentialForCalendarCache).toHaveBeenCalledWith({ credentialId });
      expect(getCalendar).toHaveBeenCalledWith(mockCredential);
      expect(result).toBeInstanceOf(CalendarCacheRepository);
    });

    it("should handle invalid credential ID", async () => {
      const credentialId = 999;

      const { getCredentialForCalendarCache } = await import("@calcom/lib/delegationCredential/server");
      vi.mocked(getCredentialForCalendarCache).mockRejectedValue(new Error("Credential not found"));

      await expect(CalendarCache.initFromCredentialId(credentialId)).rejects.toThrow("Credential not found");
    });

    it("should handle calendar creation failure", async () => {
      const credentialId = 123;
      const mockCredential = {
        id: credentialId,
        type: "google_calendar",
        key: { access_token: "invalid_token" },
        userId: 1,
      };

      const { getCredentialForCalendarCache } = await import("@calcom/lib/delegationCredential/server");
      const { getCalendar } = await import("@calcom/app-store/_utils/getCalendar");

      vi.mocked(getCredentialForCalendarCache).mockResolvedValue(mockCredential);
      vi.mocked(getCalendar).mockRejectedValue(new Error("Invalid credentials"));

      await expect(CalendarCache.initFromCredentialId(credentialId)).rejects.toThrow("Invalid credentials");
    });

    it("should return mock repository when feature is disabled", async () => {
      const credentialId = 123;
      const mockCredential = {
        id: credentialId,
        type: "google_calendar",
        key: { access_token: "token" },
        userId: 1,
      };

      const { getCredentialForCalendarCache } = await import("@calcom/lib/delegationCredential/server");
      const { getCalendar } = await import("@calcom/app-store/_utils/getCalendar");
      const { FeaturesRepository } = await import("@calcom/features/flags/features.repository");

      vi.mocked(getCredentialForCalendarCache).mockResolvedValue(mockCredential);
      vi.mocked(getCalendar).mockResolvedValue(mockCalendar);

      const mockFeaturesRepo = {
        checkIfFeatureIsEnabledGlobally: vi.fn().mockResolvedValue(false),
      };
      vi.mocked(FeaturesRepository).mockImplementation(() => mockFeaturesRepo);

      const result = await CalendarCache.initFromCredentialId(credentialId);

      expect(result).toBeInstanceOf(CalendarCacheRepositoryMock);
    });

    it("should handle null calendar from getCalendar", async () => {
      const credentialId = 123;
      const mockCredential = {
        id: credentialId,
        type: "google_calendar",
        key: { access_token: "token" },
        userId: 1,
      };

      const { getCredentialForCalendarCache } = await import("@calcom/lib/delegationCredential/server");
      const { getCalendar } = await import("@calcom/app-store/_utils/getCalendar");
      const { FeaturesRepository } = await import("@calcom/features/flags/features.repository");

      vi.mocked(getCredentialForCalendarCache).mockResolvedValue(mockCredential);
      vi.mocked(getCalendar).mockResolvedValue(null);

      const mockFeaturesRepo = {
        checkIfFeatureIsEnabledGlobally: vi.fn().mockResolvedValue(true),
      };
      vi.mocked(FeaturesRepository).mockImplementation(() => mockFeaturesRepo);

      const result = await CalendarCache.initFromCredentialId(credentialId);

      expect(result).toBeInstanceOf(CalendarCacheRepository);
    });
  });
});
