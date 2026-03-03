import type { Mock } from "vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { checkSuccessRedirectUrlAllowed } from "./successRedirectUrlAllowed";

const mockHasSuccessRedirectUrl: Mock = vi.fn();
const mockCheckUserHasActivePaidTeamPlan: Mock = vi.fn();

vi.mock("@calcom/features/eventtypes/repositories/EventRepository", () => ({
  EventRepository: {
    hasSuccessRedirectUrl: (...args: unknown[]) => mockHasSuccessRedirectUrl(...args),
  },
}));

vi.mock("@calcom/features/ee/teams/lib/checkUserHasActivePaidTeamPlan", () => ({
  checkUserHasActivePaidTeamPlan: (...args: unknown[]) => mockCheckUserHasActivePaidTeamPlan(...args),
}));

vi.mock("@calcom/lib/constants", () => ({
  IS_SELF_HOSTED: false,
}));

describe("checkSuccessRedirectUrlAllowed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("when user has an active paid team plan", () => {
    beforeEach(() => {
      mockCheckUserHasActivePaidTeamPlan.mockResolvedValue({ isActive: true, isTrial: false });
    });

    it("should allow setting successRedirectUrl", async () => {
      const result = await checkSuccessRedirectUrlAllowed({ userId: 1 });

      expect(result).toEqual({ allowed: true });
      expect(mockCheckUserHasActivePaidTeamPlan).toHaveBeenCalledWith(1);
    });

    it("should allow updating successRedirectUrl even if event type has no existing redirect", async () => {
      mockHasSuccessRedirectUrl.mockResolvedValue(false);

      const result = await checkSuccessRedirectUrlAllowed({ userId: 1, eventTypeId: 100 });

      expect(result).toEqual({ allowed: true });
    });
  });

  describe("when user is on a trial", () => {
    beforeEach(() => {
      mockCheckUserHasActivePaidTeamPlan.mockResolvedValue({ isActive: false, isTrial: true });
    });

    it("should not allow setting successRedirectUrl", async () => {
      const result = await checkSuccessRedirectUrlAllowed({ userId: 1 });

      expect(result).toEqual({
        allowed: false,
        reason:
          "Redirect on booking is a feature for team plan users. Please upgrade to a team plan to use this feature.",
      });
    });

    it("should not allow setting successRedirectUrl on update if event type has no existing redirect", async () => {
      mockHasSuccessRedirectUrl.mockResolvedValue(false);

      const result = await checkSuccessRedirectUrlAllowed({ userId: 1, eventTypeId: 100 });

      expect(result).toEqual({
        allowed: false,
        reason:
          "Redirect on booking is a feature for team plan users. Please upgrade to a team plan to use this feature.",
      });
    });
  });

  describe("when user does not have any team membership", () => {
    beforeEach(() => {
      mockCheckUserHasActivePaidTeamPlan.mockResolvedValue({ isActive: false, isTrial: false });
    });

    it("should not allow setting successRedirectUrl on create", async () => {
      const result = await checkSuccessRedirectUrlAllowed({ userId: 1 });

      expect(result).toEqual({
        allowed: false,
        reason:
          "Redirect on booking is a feature for team plan users. Please upgrade to a team plan to use this feature.",
      });
    });

    it("should not allow setting successRedirectUrl on update if event type has no existing redirect", async () => {
      mockHasSuccessRedirectUrl.mockResolvedValue(false);

      const result = await checkSuccessRedirectUrlAllowed({ userId: 1, eventTypeId: 100 });

      expect(result).toEqual({
        allowed: false,
        reason:
          "Redirect on booking is a feature for team plan users. Please upgrade to a team plan to use this feature.",
      });
      expect(mockHasSuccessRedirectUrl).toHaveBeenCalledWith(100);
    });
  });

  describe("grandfathering", () => {
    it("should allow updating successRedirectUrl if event type already has one (grandfathered)", async () => {
      mockHasSuccessRedirectUrl.mockResolvedValue(true);
      mockCheckUserHasActivePaidTeamPlan.mockResolvedValue({ isActive: false, isTrial: false });

      const result = await checkSuccessRedirectUrlAllowed({ userId: 1, eventTypeId: 100 });

      expect(result).toEqual({ allowed: true });
      expect(mockHasSuccessRedirectUrl).toHaveBeenCalledWith(100);
      // Should not check billing if grandfathered
      expect(mockCheckUserHasActivePaidTeamPlan).not.toHaveBeenCalled();
    });

    it("should allow trial users to update existing redirect URL (grandfathered)", async () => {
      mockHasSuccessRedirectUrl.mockResolvedValue(true);
      mockCheckUserHasActivePaidTeamPlan.mockResolvedValue({ isActive: false, isTrial: true });

      const result = await checkSuccessRedirectUrlAllowed({ userId: 1, eventTypeId: 100 });

      expect(result).toEqual({ allowed: true });
    });
  });

  describe("edge cases", () => {
    it("should not check for existing redirect URL if eventTypeId is not provided", async () => {
      mockCheckUserHasActivePaidTeamPlan.mockResolvedValue({ isActive: false, isTrial: false });

      await checkSuccessRedirectUrlAllowed({ userId: 1 });

      expect(mockHasSuccessRedirectUrl).not.toHaveBeenCalled();
    });

    it("should check billing status after grandfathering check fails", async () => {
      mockHasSuccessRedirectUrl.mockResolvedValue(false);
      mockCheckUserHasActivePaidTeamPlan.mockResolvedValue({ isActive: false, isTrial: true });

      await checkSuccessRedirectUrlAllowed({ userId: 1, eventTypeId: 100 });

      expect(mockHasSuccessRedirectUrl).toHaveBeenCalledWith(100);
      expect(mockCheckUserHasActivePaidTeamPlan).toHaveBeenCalledWith(1);
    });
  });
});
