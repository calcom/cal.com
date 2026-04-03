import { beforeEach, describe, expect, it, vi } from "vitest";

import type { WhitelistUserWorkflowsInput } from "../actions/whitelist-user-workflows";
import { WhitelistUserWorkflowsAction } from "../actions/whitelist-user-workflows";

function createMockDeps() {
  return {
    userRepo: {
      findById: vi.fn().mockResolvedValue({
        id: 42,
        email: "user@example.com",
        username: "testuser",
        twoFactorEnabled: false,
      }),
    },
    workflowRepo: {
      setWhitelisted: vi.fn().mockResolvedValue({ id: 42, whitelistWorkflows: true }),
      verifyUnverifiedSteps: vi.fn(),
    },
  };
}

describe("WhitelistUserWorkflowsAction", () => {
  let deps: ReturnType<typeof createMockDeps>;
  let action: WhitelistUserWorkflowsAction;

  beforeEach(() => {
    deps = createMockDeps();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    action = new WhitelistUserWorkflowsAction(deps as any);
  });

  it("should whitelist workflows for a user", async () => {
    const input: WhitelistUserWorkflowsInput = { userId: 42, whitelistWorkflows: true };

    const result = await action.execute(input);

    expect(deps.userRepo.findById).toHaveBeenCalledWith(42);
    expect(deps.workflowRepo.setWhitelisted).toHaveBeenCalledWith(42, true);
    expect(result).toEqual({
      success: true,
      userId: 42,
      whitelistWorkflows: true,
    });
  });

  it("should remove workflow whitelist for a user", async () => {
    deps.workflowRepo.setWhitelisted.mockResolvedValue({ id: 42, whitelistWorkflows: false });

    const input: WhitelistUserWorkflowsInput = { userId: 42, whitelistWorkflows: false };

    const result = await action.execute(input);

    expect(deps.workflowRepo.setWhitelisted).toHaveBeenCalledWith(42, false);
    expect(result).toEqual({
      success: true,
      userId: 42,
      whitelistWorkflows: false,
    });
  });

  it("should throw NotFound when user does not exist", async () => {
    deps.userRepo.findById.mockResolvedValue(null);

    await expect(action.execute({ userId: 999, whitelistWorkflows: true })).rejects.toThrow(
      "User 999 not found"
    );
    expect(deps.workflowRepo.setWhitelisted).not.toHaveBeenCalled();
  });
});
