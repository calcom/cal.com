import prismock from "../../../../../tests/libs/__mocks__/prisma";

import { test, beforeEach, describe, expect, vi } from "vitest";

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
});

test("TODO: Internal billing is called when team billing is enabled", async () => {
  expect(true).toBe(false);
});

test("Subscription is cancelled when team is deleted", async () => {
  expect(true).toBe(false);
});

test("Team is marked as pending payment when renewal charge fails", async () => {
  expect(true).toBe(false);
});

test("Team is deleted when X amount of days pass with pending payment", async () => {
  expect(true).toBe(false);
});
