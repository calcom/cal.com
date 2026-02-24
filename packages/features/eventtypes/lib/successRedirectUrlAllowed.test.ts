import type { Mock } from "vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { checkSuccessRedirectUrlAllowed } from "./successRedirectUrlAllowed";

const mockHasSuccessRedirectUrl: Mock = vi.fn();
const mockHasAcceptedPublishedTeamMembership: Mock = vi.fn();

vi.mock("@calcom/features/eventtypes/repositories/EventRepository", () => ({
  EventRepository: {
    hasSuccessRedirectUrl: (...args: unknown[]) => mockHasSuccessRedirectUrl(...args),
  },
}));

vi.mock("@calcom/features/membership/repositories/MembershipRepository", () => ({
  MembershipRepository: {
    hasAcceptedPublishedTeamMembership: (...args: unknown[]) => mockHasAcceptedPublishedTeamMembership(...args),
  },
}));

describe("checkSuccessRedirectUrlAllowed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("when user has a team plan", () => {
    it("should allow setting successRedirectUrl", async () => {
      mockHasAcceptedPublishedTeamMembership.mockResolvedValue(true);

      const result = await checkSuccessRedirectUrlAllowed({ userId: 1 });

      expect(result).toEqual({ allowed: true });
      expect(mockHasAcceptedPublishedTeamMembership).toHaveBeenCalledWith(1);
    });

    it("should allow updating successRedirectUrl even if event type has no existing redirect", async () => {
      mockHasSuccessRedirectUrl.mockResolvedValue(false);
      mockHasAcceptedPublishedTeamMembership.mockResolvedValue(true);

      const result = await checkSuccessRedirectUrlAllowed({ userId: 1, eventTypeId: 100 });

      expect(result).toEqual({ allowed: true });
    });
  });

  describe("when user does not have a team plan", () => {
    beforeEach(() => {
      mockHasAcceptedPublishedTeamMembership.mockResolvedValue(false);
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

    describe("grandfathering", () => {
      it("should allow updating successRedirectUrl if event type already has one (grandfathered)", async () => {
        mockHasSuccessRedirectUrl.mockResolvedValue(true);

        const result = await checkSuccessRedirectUrlAllowed({ userId: 1, eventTypeId: 100 });

        expect(result).toEqual({ allowed: true });
        expect(mockHasSuccessRedirectUrl).toHaveBeenCalledWith(100);
        expect(mockHasAcceptedPublishedTeamMembership).not.toHaveBeenCalled();
      });
    });
  });

  describe("edge cases", () => {
    it("should not check for existing redirect URL if eventTypeId is not provided", async () => {
      mockHasAcceptedPublishedTeamMembership.mockResolvedValue(false);

      await checkSuccessRedirectUrlAllowed({ userId: 1 });

      expect(mockHasSuccessRedirectUrl).not.toHaveBeenCalled();
    });

    it("should check team membership after grandfathering check fails", async () => {
      mockHasSuccessRedirectUrl.mockResolvedValue(false);
      mockHasAcceptedPublishedTeamMembership.mockResolvedValue(false);

      await checkSuccessRedirectUrlAllowed({ userId: 1, eventTypeId: 100 });

      expect(mockHasSuccessRedirectUrl).toHaveBeenCalledWith(100);
      expect(mockHasAcceptedPublishedTeamMembership).toHaveBeenCalledWith(1);
    });
  });
});
