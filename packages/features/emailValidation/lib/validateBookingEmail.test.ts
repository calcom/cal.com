import type { Logger } from "tslog";
import { describe, expect, it, vi, beforeEach, Mocked } from "vitest";

import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { HttpError } from "@calcom/lib/http-error";

import { getEmailValidationService } from "../di/EmailValidation.container";
import { IEmailValidationService } from "./service/IEmailValidationService.interface";
import { ZeroBounceEmailValidationProviderService } from "./service/ZeroBounceEmailValidationProviderService";
import { validateBookingEmail } from "./validateBookingEmail";

// Mock dependencies
vi.mock("@calcom/features/flags/features.repository");
vi.mock("../di/EmailValidation.container");

const mockFeaturesRepository = vi.mocked(FeaturesRepository);
const mockGetEmailValidationService = vi.mocked(getEmailValidationService);

const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
} as unknown as Logger<unknown>;

describe("validateBookingEmail", () => {
  let mockEmailValidationService: Mocked<IEmailValidationService>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockEmailValidationService = {
      validateEmail: vi.fn(),
      isEmailBlocked: vi.fn(),
    };

    mockGetEmailValidationService.mockReturnValue(mockEmailValidationService);
  });

  describe("feature flag checks", () => {
    it("should skip validation when no team is associated", async () => {
      await validateBookingEmail({
        email: "test@example.com",
        teamId: null,
        logger: mockLogger,
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        "Email validation skipped - no team associated with event type"
      );
      expect(mockEmailValidationService.validateEmail).not.toHaveBeenCalled();
    });

    it("should skip validation when feature is not enabled for team", async () => {
      const mockCheckFeature = vi.fn().mockResolvedValue(false);
      mockFeaturesRepository.prototype.checkIfTeamHasFeature = mockCheckFeature;

      await validateBookingEmail({
        email: "test@example.com",
        teamId: 123,
        logger: mockLogger,
      });

      expect(mockCheckFeature).toHaveBeenCalledWith(123, "booking-email-validation");
      expect(mockLogger.info).toHaveBeenCalledWith("Email validation feature not enabled for team", {
        teamId: 123,
      });
      expect(mockEmailValidationService.validateEmail).not.toHaveBeenCalled();
    });

    it("should use team.id when teamId is not present", async () => {
      const mockCheckFeature = vi.fn().mockResolvedValue(false);
      mockFeaturesRepository.prototype.checkIfTeamHasFeature = mockCheckFeature;

      await validateBookingEmail({
        email: "test@example.com",
        teamId: 456,
        logger: mockLogger,
      });

      expect(mockCheckFeature).toHaveBeenCalledWith(456, "booking-email-validation");
      expect(mockLogger.info).toHaveBeenCalledWith("Email validation feature not enabled for team", {
        teamId: 456,
      });
    });
  });

  describe("email validation", () => {
    beforeEach(() => {
      const mockCheckFeature = vi.fn().mockResolvedValue(true);
      mockFeaturesRepository.prototype.checkIfTeamHasFeature = mockCheckFeature;
    });

    it("should allow valid emails", async () => {
      mockEmailValidationService.validateEmail.mockResolvedValue({
        email: "valid@example.com",
        status: "valid",
        processedAt: "2023-12-07T10:00:00.000Z",
      });

      await validateBookingEmail({
        email: "valid@example.com",
        teamId: 123,
        logger: mockLogger,
      });

      expect(mockEmailValidationService.validateEmail).toHaveBeenCalledWith({
        email: "valid@example.com",
        ipAddress: undefined,
      });
      expect(mockLogger.info).toHaveBeenCalledWith("Email validation completed", {
        email: "valid@example.com",
        status: "valid",
        teamId: 123,
      });
      expect(mockLogger.info).toHaveBeenCalledWith("Email validation passed", {
        email: "valid@example.com",
        status: "valid",
        teamId: 123,
      });
    });

    it("should pass IP address to validation service when provided", async () => {
      mockEmailValidationService.validateEmail.mockResolvedValue({
        email: "test@example.com",
        status: "valid",
        processedAt: "2023-12-07T10:00:00.000Z",
      });

      await validateBookingEmail({
        email: "test@example.com",
        teamId: 123,
        logger: mockLogger,
        clientIP: "192.168.1.1",
      });

      expect(mockEmailValidationService.validateEmail).toHaveBeenCalledWith({
        email: "test@example.com",
        ipAddress: "192.168.1.1",
      });
    });

    it("should block invalid emails when using ZeroBounceEmailValidationService", async () => {
      // Mock as instance of ZeroBounceEmailValidationService
      Object.setPrototypeOf(mockEmailValidationService, ZeroBounceEmailValidationProviderService.prototype);
      mockEmailValidationService.isEmailBlocked.mockReturnValue(true);
      mockEmailValidationService.validateEmail.mockResolvedValue({
        email: "invalid@example.com",
        status: "invalid",
        processedAt: "2023-12-07T10:00:00.000Z",
      });

      await expect(
        validateBookingEmail({
          email: "invalid@example.com",
          teamId: 123,
          logger: mockLogger,
        })
      ).rejects.toThrow(HttpError);

      expect(mockLogger.info).toHaveBeenCalledWith("Email blocked due to validation status", {
        email: "invalid@example.com",
        status: "invalid",
        teamId: 123,
      });
    });

    it("should block invalid emails when using caching proxy", async () => {
      mockEmailValidationService.validateEmail.mockResolvedValue({
        email: "invalid@example.com",
        status: "invalid",
        processedAt: "2023-12-07T10:00:00.000Z",
      });

      await expect(
        validateBookingEmail({
          email: "invalid@example.com",
          teamId: 123,
          logger: mockLogger,
        })
      ).rejects.toThrow(HttpError);

      expect(mockLogger.info).toHaveBeenCalledWith("Email blocked due to validation status", {
        email: "invalid@example.com",
        status: "invalid",
        teamId: 123,
      });
    });

    it("should block spamtrap emails", async () => {
      mockEmailValidationService.validateEmail.mockResolvedValue({
        email: "spamtrap@example.com",
        status: "spamtrap",
        processedAt: "2023-12-07T10:00:00.000Z",
      });

      await expect(
        validateBookingEmail({
          email: "spamtrap@example.com",
          teamId: 123,
          logger: mockLogger,
        })
      ).rejects.toThrow(HttpError);
    });

    it("should block abuse emails", async () => {
      mockEmailValidationService.validateEmail.mockResolvedValue({
        email: "abuse@example.com",
        status: "abuse",
        processedAt: "2023-12-07T10:00:00.000Z",
      });

      await expect(
        validateBookingEmail({
          email: "abuse@example.com",
          teamId: 123,
          logger: mockLogger,
        })
      ).rejects.toThrow(HttpError);
    });

    it("should block do_not_mail emails", async () => {
      mockEmailValidationService.validateEmail.mockResolvedValue({
        email: "donotmail@example.com",
        status: "do_not_mail",
        processedAt: "2023-12-07T10:00:00.000Z",
      });

      await expect(
        validateBookingEmail({
          email: "donotmail@example.com",
          teamId: 123,
          logger: mockLogger,
        })
      ).rejects.toThrow(HttpError);
    });

    it("should allow catch-all emails", async () => {
      mockEmailValidationService.validateEmail.mockResolvedValue({
        email: "catchall@example.com",
        status: "catch-all",
        processedAt: "2023-12-07T10:00:00.000Z",
      });

      await validateBookingEmail({
        email: "catchall@example.com",
        teamId: 123,
        logger: mockLogger,
      });

      expect(mockLogger.info).toHaveBeenCalledWith("Email validation passed", {
        email: "catchall@example.com",
        status: "catch-all",
        teamId: 123,
      });
    });

    it("should allow unknown status emails", async () => {
      mockEmailValidationService.validateEmail.mockResolvedValue({
        email: "unknown@example.com",
        status: "unknown",
        processedAt: "2023-12-07T10:00:00.000Z",
      });

      await validateBookingEmail({
        email: "unknown@example.com",
        teamId: 123,
        logger: mockLogger,
      });

      expect(mockLogger.info).toHaveBeenCalledWith("Email validation passed", {
        email: "unknown@example.com",
        status: "unknown",
        teamId: 123,
      });
    });

    it("should fallback to allow on service errors", async () => {
      mockEmailValidationService.validateEmail.mockRejectedValue(new Error("Service error"));

      await validateBookingEmail({
        email: "test@example.com",
        teamId: 123,
        logger: mockLogger,
      });

      expect(mockLogger.error).toHaveBeenCalledWith("Email validation service error - allowing booking", {
        email: "test@example.com",
        error: "Service error",
        teamId: 123,
      });
    });

    it("should rethrow HttpError for blocked emails", async () => {
      const httpError = new HttpError({ statusCode: 400, message: "Email blocked" });

      mockEmailValidationService.validateEmail.mockRejectedValue(httpError);

      await expect(
        validateBookingEmail({
          email: "blocked@example.com",
          teamId: 123,
          logger: mockLogger,
        })
      ).rejects.toThrow(HttpError);
    });
  });
});
