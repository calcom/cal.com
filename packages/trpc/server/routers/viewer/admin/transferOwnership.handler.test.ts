import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetCustomer = vi.fn();
const mockUpdateCustomer = vi.fn();
const mockGetBillingProviderService = vi.fn(() => ({
  getCustomer: mockGetCustomer,
  updateCustomer: mockUpdateCustomer,
}));

vi.mock("@calcom/features/ee/billing/di/containers/Billing", () => ({
  getBillingProviderService: (...args: unknown[]) => mockGetBillingProviderService(...args),
}));

vi.mock("@calcom/lib/logger", () => ({
  default: {
    getSubLogger: () => ({
      info: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

const mockFindByUserIdAndTeamIdIncludeUser = vi.fn();
const mockTransferOwnership = vi.fn();
const mockFindById = vi.fn();

vi.mock("@calcom/features/di/containers/MembershipRepository", () => ({
  getMembershipRepository: () => ({
    findByUserIdAndTeamIdIncludeUser: (...args: unknown[]) => mockFindByUserIdAndTeamIdIncludeUser(...args),
    transferOwnership: (...args: unknown[]) => mockTransferOwnership(...args),
  }),
}));

vi.mock("@calcom/features/di/containers/TeamRepository", () => ({
  getTeamRepository: () => ({
    findById: (...args: unknown[]) => mockFindById(...args),
  }),
}));

import { TRPCError } from "@trpc/server";
import transferOwnershipHandler from "./transferOwnership.handler";

const TEAM_ID = 10;
const NEW_OWNER_USER_ID = 2;
const PREVIOUS_OWNER_USER_ID = 1;
const CUSTOMER_ID = "cus_test123";

const newOwnerMembership = {
  role: "MEMBER",
  user: { id: NEW_OWNER_USER_ID, email: "newowner@example.com", name: "New Owner" },
};

const previousOwnerMembership = {
  role: "OWNER",
  user: { id: PREVIOUS_OWNER_USER_ID, email: "prevowner@example.com", name: "Prev Owner" },
};

const mockCtx = {
  user: { id: 99, email: "admin@example.com" },
};

const baseInput = {
  teamId: TEAM_ID,
  newOwnerUserId: NEW_OWNER_USER_ID,
  previousOwnerUserId: PREVIOUS_OWNER_USER_ID,
  customerId: CUSTOMER_ID,
  previousOwnerAction: "MEMBER" as const,
};

describe("transferOwnershipHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockFindByUserIdAndTeamIdIncludeUser.mockImplementation(({ userId }: { userId: number }) => {
      if (userId === NEW_OWNER_USER_ID) return Promise.resolve(newOwnerMembership);
      if (userId === PREVIOUS_OWNER_USER_ID) return Promise.resolve(previousOwnerMembership);
      return Promise.resolve(null);
    });

    mockFindById.mockResolvedValue({ name: "Test Team" });
    mockGetCustomer.mockResolvedValue({ email: "billing@stripe.com" });
    mockUpdateCustomer.mockResolvedValue(undefined);
    mockTransferOwnership.mockResolvedValue(undefined);
  });

  describe("preview mode", () => {
    it("returns correct preview shape", async () => {
      const result = await transferOwnershipHandler({
        ctx: mockCtx as never,
        input: { ...baseInput, mode: "preview" },
      });

      expect(result).toEqual({
        mode: "preview",
        newOwner: {
          userId: NEW_OWNER_USER_ID,
          email: "newowner@example.com",
          name: "New Owner",
        },
        previousOwner: {
          userId: PREVIOUS_OWNER_USER_ID,
          email: "prevowner@example.com",
          name: "Prev Owner",
          action: "MEMBER",
        },
        stripeEmailChange: {
          from: "billing@stripe.com",
          to: "newowner@example.com",
        },
      });
    });
  });

  describe("execute mode", () => {
    it("calls transferOwnership with ADMIN action", async () => {
      const result = await transferOwnershipHandler({
        ctx: mockCtx as never,
        input: { ...baseInput, previousOwnerAction: "ADMIN", mode: "execute" },
      });

      expect(result).toEqual({ mode: "execute", success: true });
      expect(mockTransferOwnership).toHaveBeenCalledWith({
        teamId: TEAM_ID,
        newOwnerUserId: NEW_OWNER_USER_ID,
        previousOwnerUserId: PREVIOUS_OWNER_USER_ID,
        previousOwnerAction: "ADMIN",
      });
    });

    it("calls transferOwnership with MEMBER action", async () => {
      const result = await transferOwnershipHandler({
        ctx: mockCtx as never,
        input: { ...baseInput, previousOwnerAction: "MEMBER", mode: "execute" },
      });

      expect(result).toEqual({ mode: "execute", success: true });
      expect(mockTransferOwnership).toHaveBeenCalledWith({
        teamId: TEAM_ID,
        newOwnerUserId: NEW_OWNER_USER_ID,
        previousOwnerUserId: PREVIOUS_OWNER_USER_ID,
        previousOwnerAction: "MEMBER",
      });
    });

    it("calls transferOwnership with REMOVE action", async () => {
      const result = await transferOwnershipHandler({
        ctx: mockCtx as never,
        input: { ...baseInput, previousOwnerAction: "REMOVE", mode: "execute" },
      });

      expect(result).toEqual({ mode: "execute", success: true });
      expect(mockTransferOwnership).toHaveBeenCalledWith({
        teamId: TEAM_ID,
        newOwnerUserId: NEW_OWNER_USER_ID,
        previousOwnerUserId: PREVIOUS_OWNER_USER_ID,
        previousOwnerAction: "REMOVE",
      });
    });

    it("throws INTERNAL_SERVER_ERROR when Stripe update fails before DB commit", async () => {
      mockUpdateCustomer.mockRejectedValue(new Error("Stripe network error"));

      await expect(
        transferOwnershipHandler({
          ctx: mockCtx as never,
          input: { ...baseInput, mode: "execute" },
        })
      ).rejects.toMatchObject({
        code: "INTERNAL_SERVER_ERROR",
        message: expect.stringContaining("Stripe billing email"),
      });
    });
  });

  describe("validation errors", () => {
    it("throws BAD_REQUEST when new owner is not a member of the team", async () => {
      mockFindByUserIdAndTeamIdIncludeUser.mockImplementation(({ userId }: { userId: number }) => {
        if (userId === NEW_OWNER_USER_ID) return Promise.resolve(null);
        if (userId === PREVIOUS_OWNER_USER_ID) return Promise.resolve(previousOwnerMembership);
        return Promise.resolve(null);
      });

      await expect(
        transferOwnershipHandler({
          ctx: mockCtx as never,
          input: { ...baseInput, mode: "preview" },
        })
      ).rejects.toMatchObject({ code: "BAD_REQUEST", message: "User is not a member of this team" });
    });

    it("throws BAD_REQUEST when new owner is already an OWNER", async () => {
      mockFindByUserIdAndTeamIdIncludeUser.mockImplementation(({ userId }: { userId: number }) => {
        if (userId === NEW_OWNER_USER_ID) return Promise.resolve({ ...newOwnerMembership, role: "OWNER" });
        if (userId === PREVIOUS_OWNER_USER_ID) return Promise.resolve(previousOwnerMembership);
        return Promise.resolve(null);
      });

      await expect(
        transferOwnershipHandler({
          ctx: mockCtx as never,
          input: { ...baseInput, mode: "preview" },
        })
      ).rejects.toMatchObject({ code: "BAD_REQUEST", message: "User is already an owner" });
    });

    it("throws NOT_FOUND when previous owner membership is not found", async () => {
      mockFindByUserIdAndTeamIdIncludeUser.mockImplementation(({ userId }: { userId: number }) => {
        if (userId === NEW_OWNER_USER_ID) return Promise.resolve(newOwnerMembership);
        if (userId === PREVIOUS_OWNER_USER_ID) return Promise.resolve(null);
        return Promise.resolve(null);
      });

      await expect(
        transferOwnershipHandler({
          ctx: mockCtx as never,
          input: { ...baseInput, mode: "preview" },
        })
      ).rejects.toMatchObject({ code: "NOT_FOUND", message: "Previous owner membership not found" });
    });

    it("throws BAD_REQUEST when previous owner does not have OWNER role", async () => {
      mockFindByUserIdAndTeamIdIncludeUser.mockImplementation(({ userId }: { userId: number }) => {
        if (userId === NEW_OWNER_USER_ID) return Promise.resolve(newOwnerMembership);
        if (userId === PREVIOUS_OWNER_USER_ID)
          return Promise.resolve({ ...previousOwnerMembership, role: "ADMIN" });
        return Promise.resolve(null);
      });

      await expect(
        transferOwnershipHandler({
          ctx: mockCtx as never,
          input: { ...baseInput, mode: "preview" },
        })
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
        message: "Previous owner does not have OWNER role",
      });
    });
  });
});
