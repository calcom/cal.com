import { describe, it, expect, vi, beforeEach } from "vitest";

import { CreditsRepository } from "@calcom/features/credits/repositories/CreditsRepository";
import { sendVerificationCode } from "@calcom/features/ee/workflows/lib/reminders/verifyPhoneNumber";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";

import { TRPCError } from "@trpc/server";

import { hasTeamPlanHandler } from "../teams/hasTeamPlan.handler";
import { sendVerificationCodeHandler } from "./sendVerificationCode.handler";

vi.mock("@calcom/lib/checkRateLimitAndThrowError");
vi.mock("@calcom/features/credits/repositories/CreditsRepository");
vi.mock("@calcom/features/ee/workflows/lib/reminders/verifyPhoneNumber");
vi.mock("../teams/hasTeamPlan.handler");

describe("sendVerificationCodeHandler", () => {
  const mockUser = {
    id: 123,
    name: "Test User",
    email: "test@example.com",
    metadata: {},
  };

  const mockCtx = {
    user: mockUser,
  };

  const mockInput = {
    phoneNumber: "+1234567890",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkRateLimitAndThrowError).mockResolvedValue({
      success: true,
      remaining: 99,
      limit: 100,
      reset: Date.now() + 60 * 1000,
    });
    vi.mocked(CreditsRepository.findCreditBalance).mockResolvedValue({
      id: 1,
      additionalCredits: 100,
      balance: 100,
      userId: mockUser.id,
      teamId: null,
      limitReachedAt: null,
      warningSentAt: null,
      lockedAt: null,
    });
    vi.mocked(hasTeamPlanHandler).mockResolvedValue({ hasTeamPlan: false });
    vi.mocked(sendVerificationCode).mockResolvedValue({ status: "pending" });
  });

  describe("Rate Limiting", () => {
    it("should check SMS rate limit with 'sms' type before processing", async () => {
      await sendVerificationCodeHandler({ ctx: mockCtx, input: mockInput });

      expect(checkRateLimitAndThrowError).toHaveBeenCalledWith({
        identifier: `sms:verification:${mockUser.id}`,
        rateLimitingType: "sms",
      });
    });

    it("should check SMS rate limit with 'smsMonth' type before processing", async () => {
      await sendVerificationCodeHandler({ ctx: mockCtx, input: mockInput });

      expect(checkRateLimitAndThrowError).toHaveBeenCalledWith({
        identifier: `sms:verification:${mockUser.id}`,
        rateLimitingType: "smsMonth",
      });
    });

    it("should check both rate limits in order (sms first, then smsMonth)", async () => {
      const callOrder: string[] = [];
      vi.mocked(checkRateLimitAndThrowError).mockImplementation(async ({ rateLimitingType }) => {
        callOrder.push(rateLimitingType as string);
        return { success: true, remaining: 99, limit: 100, reset: Date.now() + 60 * 1000 };
      });

      await sendVerificationCodeHandler({ ctx: mockCtx, input: mockInput });

      expect(callOrder).toEqual(["sms", "smsMonth"]);
    });

    it("should check rate limits before billing gate (credits check)", async () => {
      const callOrder: string[] = [];
      vi.mocked(checkRateLimitAndThrowError).mockImplementation(async () => {
        callOrder.push("rateLimit");
        return { success: true, remaining: 99, limit: 100, reset: Date.now() + 60 * 1000 };
      });
      vi.mocked(CreditsRepository.findCreditBalance).mockImplementation(async () => {
        callOrder.push("credits");
        return {
          id: 1,
          additionalCredits: 100,
          balance: 100,
          userId: mockUser.id,
          teamId: null,
          limitReachedAt: null,
          warningSentAt: null,
          lockedAt: null,
        };
      });

      await sendVerificationCodeHandler({ ctx: mockCtx, input: mockInput });

      expect(callOrder.indexOf("rateLimit")).toBeLessThan(callOrder.indexOf("credits"));
    });

    it("should throw and not check billing when sms rate limit fails", async () => {
      vi.mocked(checkRateLimitAndThrowError).mockRejectedValueOnce(
        new Error("Rate limit exceeded. Try again in 60 seconds.")
      );

      await expect(sendVerificationCodeHandler({ ctx: mockCtx, input: mockInput })).rejects.toThrow(
        "Rate limit exceeded"
      );

      expect(CreditsRepository.findCreditBalance).not.toHaveBeenCalled();
      expect(hasTeamPlanHandler).not.toHaveBeenCalled();
      expect(sendVerificationCode).not.toHaveBeenCalled();
    });

    it("should throw and not check billing when smsMonth rate limit fails", async () => {
      vi.mocked(checkRateLimitAndThrowError)
        .mockResolvedValueOnce({ success: true, remaining: 99, limit: 100, reset: Date.now() })
        .mockRejectedValueOnce(new Error("Rate limit exceeded. Try again in 2592000 seconds."));

      await expect(sendVerificationCodeHandler({ ctx: mockCtx, input: mockInput })).rejects.toThrow(
        "Rate limit exceeded"
      );

      expect(CreditsRepository.findCreditBalance).not.toHaveBeenCalled();
      expect(hasTeamPlanHandler).not.toHaveBeenCalled();
      expect(sendVerificationCode).not.toHaveBeenCalled();
    });
  });

  describe("Authorization - Premium Users", () => {
    it("should allow premium users to send verification code", async () => {
      const premiumUser = {
        ...mockUser,
        metadata: { isPremium: true },
      };

      await sendVerificationCodeHandler({ ctx: { user: premiumUser }, input: mockInput });

      expect(sendVerificationCode).toHaveBeenCalledWith(mockInput.phoneNumber);
      // Premium users skip team plan check
      expect(hasTeamPlanHandler).not.toHaveBeenCalled();
    });

    it("should allow premium users even with no additional credits", async () => {
      const premiumUser = {
        ...mockUser,
        metadata: { isPremium: true },
      };
      vi.mocked(CreditsRepository.findCreditBalance).mockResolvedValue({
        id: 1,
        additionalCredits: 0,
        balance: 0,
        userId: mockUser.id,
        teamId: null,
        limitReachedAt: null,
        warningSentAt: null,
        lockedAt: null,
      });

      await sendVerificationCodeHandler({ ctx: { user: premiumUser }, input: mockInput });

      expect(sendVerificationCode).toHaveBeenCalledWith(mockInput.phoneNumber);
    });
  });

  describe("Authorization - Team Plan Users", () => {
    it("should allow team plan users to send verification code", async () => {
      vi.mocked(hasTeamPlanHandler).mockResolvedValue({ hasTeamPlan: true });
      vi.mocked(CreditsRepository.findCreditBalance).mockResolvedValue({
        id: 1,
        additionalCredits: 0,
        balance: 0,
        userId: mockUser.id,
        teamId: null,
        limitReachedAt: null,
        warningSentAt: null,
        lockedAt: null,
      });

      await sendVerificationCodeHandler({ ctx: mockCtx, input: mockInput });

      expect(sendVerificationCode).toHaveBeenCalledWith(mockInput.phoneNumber);
    });

    it("should check team plan for non-premium users", async () => {
      await sendVerificationCodeHandler({ ctx: mockCtx, input: mockInput });

      expect(hasTeamPlanHandler).toHaveBeenCalledWith({ ctx: mockCtx });
    });
  });

  describe("Authorization - Users with Credits", () => {
    it("should allow users with additional credits to send verification code", async () => {
      vi.mocked(CreditsRepository.findCreditBalance).mockResolvedValue({
        id: 1,
        additionalCredits: 50,
        balance: 50,
        userId: mockUser.id,
        teamId: null,
        limitReachedAt: null,
        warningSentAt: null,
        lockedAt: null,
      });
      vi.mocked(hasTeamPlanHandler).mockResolvedValue({ hasTeamPlan: false });

      await sendVerificationCodeHandler({ ctx: mockCtx, input: mockInput });

      expect(sendVerificationCode).toHaveBeenCalledWith(mockInput.phoneNumber);
    });
  });

  describe("Authorization - Unauthorized Users", () => {
    it("should throw UNAUTHORIZED when user is not premium, has no team plan, and no credits", async () => {
      vi.mocked(CreditsRepository.findCreditBalance).mockResolvedValue({
        id: 1,
        additionalCredits: 0,
        balance: 0,
        userId: mockUser.id,
        teamId: null,
        limitReachedAt: null,
        warningSentAt: null,
        lockedAt: null,
      });
      vi.mocked(hasTeamPlanHandler).mockResolvedValue({ hasTeamPlan: false });

      await expect(sendVerificationCodeHandler({ ctx: mockCtx, input: mockInput })).rejects.toThrow(
        new TRPCError({ code: "UNAUTHORIZED" })
      );

      expect(sendVerificationCode).not.toHaveBeenCalled();
    });

    it("should throw UNAUTHORIZED when creditBalance has negative additionalCredits", async () => {
      vi.mocked(CreditsRepository.findCreditBalance).mockResolvedValue({
        id: 1,
        additionalCredits: -5,
        balance: 0,
        userId: mockUser.id,
        teamId: null,
        limitReachedAt: null,
        warningSentAt: null,
        lockedAt: null,
      });
      vi.mocked(hasTeamPlanHandler).mockResolvedValue({ hasTeamPlan: false });

      await expect(sendVerificationCodeHandler({ ctx: mockCtx, input: mockInput })).rejects.toThrow(
        new TRPCError({ code: "UNAUTHORIZED" })
      );
    });
  });

  describe("Send Verification Code", () => {
    it("should call sendVerificationCode with the phone number from input", async () => {
      await sendVerificationCodeHandler({ ctx: mockCtx, input: mockInput });

      expect(sendVerificationCode).toHaveBeenCalledWith(mockInput.phoneNumber);
    });

    it("should return the result from sendVerificationCode", async () => {
      const expectedResult = { status: "pending", sid: "verification-sid" };
      vi.mocked(sendVerificationCode).mockResolvedValue(expectedResult);

      const result = await sendVerificationCodeHandler({ ctx: mockCtx, input: mockInput });

      expect(result).toEqual(expectedResult);
    });
  });

  describe("Edge Cases", () => {
    it("should handle null credit balance gracefully", async () => {
      vi.mocked(CreditsRepository.findCreditBalance).mockResolvedValue(null);
      vi.mocked(hasTeamPlanHandler).mockResolvedValue({ hasTeamPlan: true });

      await sendVerificationCodeHandler({ ctx: mockCtx, input: mockInput });

      expect(sendVerificationCode).toHaveBeenCalledWith(mockInput.phoneNumber);
    });

    it("should handle user without metadata gracefully", async () => {
      const userWithoutMetadata = {
        ...mockUser,
        metadata: undefined,
      };
      vi.mocked(hasTeamPlanHandler).mockResolvedValue({ hasTeamPlan: true });

      await sendVerificationCodeHandler({ ctx: { user: userWithoutMetadata }, input: mockInput });

      expect(sendVerificationCode).toHaveBeenCalledWith(mockInput.phoneNumber);
    });
  });
});