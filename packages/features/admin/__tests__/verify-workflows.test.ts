import { beforeEach, describe, expect, it, vi } from "vitest";

import type { VerifyWorkflowsInput } from "../actions/verify-workflows";
import { VerifyWorkflowsAction } from "../actions/verify-workflows";

function createMockDeps() {
  return {
    userRepo: {
      findById: vi.fn().mockResolvedValue({
        id: 42,
        email: "user@example.com",
        username: "testuser",
        twoFactorEnabled: false,
      }),
      setLocked: vi.fn(),
      removeTwoFactor: vi.fn(),
      verifyWorkflowSteps: vi.fn(),
    },
    workflowRepo: {
      verifyUnverifiedSteps: vi.fn().mockResolvedValue({ count: 3 }),
    },
  };
}

describe("VerifyWorkflowsAction", () => {
  let deps: ReturnType<typeof createMockDeps>;
  let action: VerifyWorkflowsAction;

  beforeEach(() => {
    deps = createMockDeps();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    action = new VerifyWorkflowsAction(deps as any);
  });

  it("should verify unverified workflow steps for a user", async () => {
    const input: VerifyWorkflowsInput = { userId: 42 };

    const result = await action.execute(input);

    expect(deps.userRepo.findById).toHaveBeenCalledWith(42);
    expect(deps.workflowRepo.verifyUnverifiedSteps).toHaveBeenCalledWith(42);
    expect(result).toEqual({
      success: true,
      userId: 42,
      verifiedCount: 3,
    });
  });

  it("should throw NotFound when user does not exist", async () => {
    deps.userRepo.findById.mockResolvedValue(null);

    await expect(action.execute({ userId: 999 })).rejects.toThrow("User 999 not found");
    expect(deps.workflowRepo.verifyUnverifiedSteps).not.toHaveBeenCalled();
  });

  it("should return zero count when no unverified steps exist", async () => {
    deps.workflowRepo.verifyUnverifiedSteps.mockResolvedValue({ count: 0 });

    const result = await action.execute({ userId: 42 });

    expect(result).toEqual({
      success: true,
      userId: 42,
      verifiedCount: 0,
    });
  });
});
