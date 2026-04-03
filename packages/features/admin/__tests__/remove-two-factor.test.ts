import { beforeEach, describe, expect, it, vi } from "vitest";

import type { RemoveTwoFactorInput } from "../actions/remove-two-factor";
import { RemoveTwoFactorAction } from "../actions/remove-two-factor";

function createMockDeps() {
  return {
    userRepo: {
      findById: vi.fn().mockResolvedValue({
        id: 42,
        email: "user@example.com",
        username: "testuser",
        twoFactorEnabled: true,
      }),
      removeTwoFactor: vi.fn().mockResolvedValue({
        id: 42,
        email: "user@example.com",
        username: "testuser",
      }),
      setLocked: vi.fn(),
      verifyWorkflowSteps: vi.fn(),
    },
  };
}

describe("RemoveTwoFactorAction", () => {
  let deps: ReturnType<typeof createMockDeps>;
  let action: RemoveTwoFactorAction;

  beforeEach(() => {
    deps = createMockDeps();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    action = new RemoveTwoFactorAction(deps as any);
  });

  it("should remove 2FA for an existing user", async () => {
    const input: RemoveTwoFactorInput = { userId: 42 };

    const result = await action.execute(input);

    expect(deps.userRepo.findById).toHaveBeenCalledWith(42);
    expect(deps.userRepo.removeTwoFactor).toHaveBeenCalledWith(42);
    expect(result).toEqual({
      success: true,
      userId: 42,
    });
  });

  it("should throw NotFound when user does not exist", async () => {
    deps.userRepo.findById.mockResolvedValue(null);

    await expect(action.execute({ userId: 999 })).rejects.toThrow("User 999 not found");
    expect(deps.userRepo.removeTwoFactor).not.toHaveBeenCalled();
  });
});
