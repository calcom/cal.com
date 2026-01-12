import type { IncomingHttpHeaders } from "node:http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { EventTypeRepository } from "@calcom/features/eventtypes/repositories/eventTypeRepository";
import type { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";
import { HttpError } from "@calcom/lib/http-error";

import { BotDetectionService } from "./BotDetectionService";

// Mock the botid/server module
vi.mock("botid/server", () => ({
  checkBotId: vi.fn(),
}));

// Mock the logger
vi.mock("@calcom/lib/logger", () => ({
  default: {
    getSubLogger: vi.fn(() => ({
      warn: vi.fn(),
      info: vi.fn(),
      error: vi.fn(),
    })),
  },
}));

describe("BotDetectionService", () => {
  let botDetectionService: BotDetectionService;
  let mockFeaturesRepository: FeaturesRepository;
  let mockEventTypeRepository: EventTypeRepository;
  let mockHeaders: IncomingHttpHeaders;

  beforeEach(() => {
    vi.clearAllMocks();

    mockFeaturesRepository = {
      checkIfTeamHasFeature: vi.fn(),
    } as unknown as FeaturesRepository;

    mockEventTypeRepository = {
      getTeamIdByEventTypeId: vi.fn(),
    } as unknown as EventTypeRepository;

    mockHeaders = {
      "user-agent": "Mozilla/5.0",
      "x-forwarded-for": "192.168.1.1",
    };

    botDetectionService = new BotDetectionService(mockFeaturesRepository, mockEventTypeRepository);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("checkBotDetection", () => {
    it("should return early if BotID is not enabled at instance level", async () => {
      vi.stubEnv("NEXT_PUBLIC_VERCEL_USE_BOTID_IN_BOOKER", "0");

      await botDetectionService.checkBotDetection({
        eventTypeId: 123,
        headers: mockHeaders,
      });

      expect(mockEventTypeRepository.getTeamIdByEventTypeId).not.toHaveBeenCalled();
    });

    it("should return early if no eventTypeId is provided", async () => {
      vi.stubEnv("NEXT_PUBLIC_VERCEL_USE_BOTID_IN_BOOKER", "1");

      await botDetectionService.checkBotDetection({
        headers: mockHeaders,
      });

      expect(mockEventTypeRepository.getTeamIdByEventTypeId).not.toHaveBeenCalled();
    });

    it("should throw ErrorWithCode for invalid eventTypeId", async () => {
      vi.stubEnv("NEXT_PUBLIC_VERCEL_USE_BOTID_IN_BOOKER", "1");

      await expect(
        botDetectionService.checkBotDetection({
          eventTypeId: "3823346KiEg1Zk6') OR 370=(SELECT 370 FROM PG_SLEEP(15))--" as unknown as number,
          headers: mockHeaders,
        })
      ).rejects.toThrow(ErrorWithCode);

      await expect(
        botDetectionService.checkBotDetection({
          eventTypeId: -1,
          headers: mockHeaders,
        })
      ).rejects.toThrow(ErrorWithCode);

      await expect(
        botDetectionService.checkBotDetection({
          eventTypeId: 1.5,
          headers: mockHeaders,
        })
      ).rejects.toThrow(ErrorWithCode);

      try {
        await botDetectionService.checkBotDetection({
          eventTypeId: -1,
          headers: mockHeaders,
        });
      } catch (error) {
        expect(error).toBeInstanceOf(ErrorWithCode);
        expect((error as ErrorWithCode).code).toBe(ErrorCode.BadRequest);
      }
    });

    it("should return early if event type has no teamId", async () => {
      vi.stubEnv("NEXT_PUBLIC_VERCEL_USE_BOTID_IN_BOOKER", "1");
      vi.mocked(mockEventTypeRepository.getTeamIdByEventTypeId).mockResolvedValue({
        teamId: null,
      });

      await botDetectionService.checkBotDetection({
        eventTypeId: 123,
        headers: mockHeaders,
      });

      expect(mockFeaturesRepository.checkIfTeamHasFeature).not.toHaveBeenCalled();
    });

    it("should return early if BotID feature is not enabled for the team", async () => {
      vi.stubEnv("NEXT_PUBLIC_VERCEL_USE_BOTID_IN_BOOKER", "1");
      vi.mocked(mockEventTypeRepository.getTeamIdByEventTypeId).mockResolvedValue({
        teamId: 456,
      });
      vi.mocked(mockFeaturesRepository.checkIfTeamHasFeature).mockResolvedValue(false);

      const { checkBotId } = await import("botid/server");

      await botDetectionService.checkBotDetection({
        eventTypeId: 123,
        headers: mockHeaders,
      });

      expect(checkBotId).not.toHaveBeenCalled();
    });

    it("should throw HttpError when a bot is detected", async () => {
      vi.stubEnv("NEXT_PUBLIC_VERCEL_USE_BOTID_IN_BOOKER", "1");
      vi.mocked(mockEventTypeRepository.getTeamIdByEventTypeId).mockResolvedValue({
        teamId: 456,
      });
      vi.mocked(mockFeaturesRepository.checkIfTeamHasFeature).mockResolvedValue(true);

      const { checkBotId } = await import("botid/server");
      vi.mocked(checkBotId).mockResolvedValue({
        isBot: true,
        isHuman: false,
        isVerifiedBot: false,
        verifiedBotName: undefined,
        verifiedBotCategory: undefined,
        bypassed: false,
        classificationReason: "suspicious-patterns",
      });

      await expect(
        botDetectionService.checkBotDetection({
          eventTypeId: 123,
          headers: mockHeaders,
        })
      ).rejects.toThrow(HttpError);

      await expect(
        botDetectionService.checkBotDetection({
          eventTypeId: 123,
          headers: mockHeaders,
        })
      ).rejects.toThrow("Access denied");
    });

    it("should pass when a human is detected", async () => {
      vi.stubEnv("NEXT_PUBLIC_VERCEL_USE_BOTID_IN_BOOKER", "1");
      vi.mocked(mockEventTypeRepository.getTeamIdByEventTypeId).mockResolvedValue({
        teamId: 456,
      });
      vi.mocked(mockFeaturesRepository.checkIfTeamHasFeature).mockResolvedValue(true);

      const { checkBotId } = await import("botid/server");
      vi.mocked(checkBotId).mockResolvedValue({
        isBot: false,
        isHuman: true,
        isVerifiedBot: false,
        verifiedBotName: undefined,
        verifiedBotCategory: undefined,
        bypassed: false,
        classificationReason: "human-behavior",
      });

      await expect(
        botDetectionService.checkBotDetection({
          eventTypeId: 123,
          headers: mockHeaders,
        })
      ).resolves.not.toThrow();
    });

    it("should check feature flag with correct teamId", async () => {
      const teamId = 789;
      vi.stubEnv("NEXT_PUBLIC_VERCEL_USE_BOTID_IN_BOOKER", "1");
      vi.mocked(mockEventTypeRepository.getTeamIdByEventTypeId).mockResolvedValue({
        teamId,
      });
      vi.mocked(mockFeaturesRepository.checkIfTeamHasFeature).mockResolvedValue(false);

      await botDetectionService.checkBotDetection({
        eventTypeId: 123,
        headers: mockHeaders,
      });

      expect(mockFeaturesRepository.checkIfTeamHasFeature).toHaveBeenCalledWith(teamId, "booker-botid");
    });
  });
});
