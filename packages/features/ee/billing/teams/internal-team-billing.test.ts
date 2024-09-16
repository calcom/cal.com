import prismock from "../../../../../tests/libs/__mocks__/prisma";

import { test, beforeEach, describe, expect, vi } from "vitest";

import { InternalTeamBilling } from "@calcom/features/ee/billing/teams/internal-team-billing";
import { TeamRepository } from "@calcom/lib/server/repository/team";
import { UserRepository } from "@calcom/lib/server/repository/user";
import bulkDeleteUsers from "@calcom/trpc/server/routers/viewer/organizations/bulkDeleteUsers.handler";

import { mockTRPCContext } from "../../../../../tests/libs/mockTRPCContext";

vi.mock("@calcom/lib/constants", () => ({
  IS_PRODUCTION: true,
  IS_TEAM_BILLING_ENABLED: true,
}));

const buildOrgMockData = () => ({ id: null, isOrgAdmin: false, metadata: {}, requestedSlug: null });

const buildProfileMockData = (user) => ({
  username: "test",
  upId: "usr-xx",
  id: null,
  organizationId: 999,
  name: "Test User",
  avatarUrl: null,
  startTime: 0,
  endTime: 1440,
  bufferTime: 0,
  user,
  movedFromUser: null,
  createdAt: null,
  uid: null,
  userId: 1137,
  updatedAt: null,
});

async function buildMockData() {
  const promise = await prismock.user.create({
    data: {
      username: "test",
      name: "Test User",
      email: "test@example.com",
      organization: {
        create: {
          id: 999,
          name: "Test Org",
          slug: "test-org",
          isOrganization: true,
          metadata: {},
        },
      },
    },
    include: {
      organization: true,
    },
  });

  const user = await promise;
  console.log("user", user);
  const _user = await UserRepository.enrichUserWithTheProfile({
    user: user,
    upId: `usr-${user.id}`,
  });
  return _user;
}

describe("TeamBilling", async () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
  });

  test("Bulk invite should update subcription", async () => {
    const ctx = await mockTRPCContext();
    const result = await bulkDeleteUsers({ ctx, input: { userIds: [2, 3, 4, 5] } });
    expect(result).toMatchInlineSnapshot();
  });

  test("Subscription is cancelled when team is deleted", async () => {
    // Mock the TeamRepository and InternalTeamBilling
    const mockCancel = vi.fn();
    vi.mock("@calcom/lib/server/repository/team", () => ({
      TeamRepository: {
        deleteById: vi.fn(),
      },
    }));
    vi.mock("@calcom/features/ee/billing/teams/internal-team-billing", () => ({
      InternalTeamBilling: vi.fn().mockImplementation(() => ({
        cancel: mockCancel,
      })),
    }));

    // Set up test data
    const teamId = 1;

    // Call the deleteById method
    await TeamRepository.deleteById({ id: teamId });

    // Assert that InternalTeamBilling was instantiated with the correct team ID
    expect(InternalTeamBilling).toHaveBeenCalledWith(expect.objectContaining({ id: teamId }));

    // Assert that the cancel method was called
    expect(mockCancel).toHaveBeenCalled();

    // Assert that TeamRepository.deleteById was called with the correct ID
    expect(TeamRepository.deleteById).toHaveBeenCalledWith({ id: teamId });
  });
});

test.skip("TODO: Subscription is cancelled when team is deleted", async () => {
  expect(true).toBe(false);
});

test.skip("TODO: Team is marked as pending payment when renewal charge fails", async () => {
  expect(true).toBe(false);
});

test.skip("TODO: Team is deleted when X amount of days pass with pending payment", async () => {
  expect(true).toBe(false);
});
