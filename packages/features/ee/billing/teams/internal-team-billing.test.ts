import prismaMock from "../../../../../tests/libs/__mocks__/prismaMock";

import { test, beforeEach, describe, expect, vi } from "vitest";

import { TeamBilling } from "@calcom/features/ee/billing/teams";
import { TeamRepository } from "@calcom/lib/server/repository/team";
import { UserRepository } from "@calcom/lib/server/repository/user";
import bulkDeleteUsers from "@calcom/trpc/server/routers/viewer/organizations/bulkDeleteUsers.handler";

import { mockTRPCContext } from "../../../../../tests/libs/mockTRPCContext";

vi.mock("@calcom/lib/constants", () => ({
  IS_PRODUCTION: true,
  IS_TEAM_BILLING_ENABLED: true,
}));

describe.skip("TeamBilling", async () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
  });

  test("Subscription is cancelled when team is deleted", async () => {
    const mockTeamBilling = {
      cancel: vi.fn(),
    };
    // // vi.spyOn(TeamBilling, 'findAndInit').mockResolvedValue(mockTeamBilling);
    // // vi.spyOn(TeamRepository, '_deleteWorkflowRemindersOfRemovedTeam').mockResolvedValue();
    // prismaMock.$transaction.mockResolvedValue([{ id: 2 }]);

    // Call the method
    await TeamRepository.deleteById({ id: 1 });
    expect(mockTeamBilling.cancel).toHaveBeenCalledTimes(1);
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
