import { beforeEach, describe, expect, it, vi } from "vitest";

import { LockUserAccountAction } from "../actions/user/lock-user-account";
import type { LockUserAccountInput } from "../actions/user/lock-user-account";

function createMockDeps() {
  return {
    userRepo: {
      setLocked: vi.fn().mockResolvedValue({ id: 42, email: "test@example.com", username: "testuser" }),
    },
    userUnblockService: {
      clearWatchlistAndVerify: vi.fn().mockResolvedValue(undefined),
      unblockByEmail: vi.fn().mockResolvedValue(undefined),
    },
    workflowRemovalService: {
      deleteAllWorkflowRemindersForUser: vi.fn().mockResolvedValue(0),
    },
    logger: { info: vi.fn(), error: vi.fn() },
  };
}

describe("LockUserAccountAction", () => {
  let deps: ReturnType<typeof createMockDeps>;
  let action: LockUserAccountAction;

  beforeEach(() => {
    deps = createMockDeps();
    action = new LockUserAccountAction(deps);
  });

  describe("unlocking a user", () => {
    const input: LockUserAccountInput = { userId: 42, locked: false };

    it("should call UserUnblockService.clearWatchlistAndVerify", async () => {
      await action.execute(input);

      expect(deps.userUnblockService.clearWatchlistAndVerify).toHaveBeenCalledWith({
        email: "test@example.com",
        username: "testuser",
      });
    });

    it("should pass empty string for username when null", async () => {
      deps.userRepo.setLocked.mockResolvedValue({ id: 42, email: "test@example.com", username: null });

      await action.execute(input);

      expect(deps.userUnblockService.clearWatchlistAndVerify).toHaveBeenCalledWith({
        email: "test@example.com",
        username: "",
      });
    });
  });

  describe("locking a user", () => {
    const input: LockUserAccountInput = { userId: 42, locked: true };

    it("should not call UserUnblockService when locking", async () => {
      await action.execute(input);

      expect(deps.userUnblockService.clearWatchlistAndVerify).not.toHaveBeenCalled();
    });

    it("should cancel scheduled workflow reminders when locking a user", async () => {
      deps.workflowRemovalService.deleteAllWorkflowRemindersForUser.mockResolvedValue(2);

      await action.execute(input);

      expect(deps.workflowRemovalService.deleteAllWorkflowRemindersForUser).toHaveBeenCalledWith(42);
    });

    it("should not fail if cancelling workflow reminders throws an error", async () => {
      deps.workflowRemovalService.deleteAllWorkflowRemindersForUser.mockRejectedValue(new Error("DB error"));

      const result = await action.execute(input);

      expect(result).toEqual({ success: true, userId: 42, locked: true });
    });
  });

  describe("unlocking does not cancel workflow reminders", () => {
    it("should not query for workflow reminders when unlocking", async () => {
      await action.execute({ userId: 42, locked: false });

      expect(deps.workflowRemovalService.deleteAllWorkflowRemindersForUser).not.toHaveBeenCalled();
    });
  });
});
