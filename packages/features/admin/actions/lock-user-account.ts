import type { AdminAction } from "./admin-action";
import type { AdminUserRepository } from "../repositories/AdminUserRepository";
import type { UserUnblockService } from "@calcom/features/watchlist/lib/service/UserUnblockService";
import { ErrorWithCode } from "@calcom/lib/errors";
import { ErrorCode } from "@calcom/lib/errorCodes";

export interface IWorkflowRemovalService {
  deleteAllWorkflowRemindersForUser(userId: number): Promise<number>;
}

export interface LockUserAccountDeps {
  userRepo: AdminUserRepository;
  userUnblockService: UserUnblockService;
  workflowRemovalService: IWorkflowRemovalService;
  logger: { info(msg: string, ...args: unknown[]): void; error(msg: string, ...args: unknown[]): void };
}

export interface LockUserAccountInput {
  userId: number;
  locked: boolean;
}

export interface LockUserAccountResult {
  success: boolean;
  userId: number;
  locked: boolean;
}

export class LockUserAccountAction implements AdminAction<LockUserAccountInput, LockUserAccountResult> {
  constructor(private deps: LockUserAccountDeps) {}

  async execute(input: LockUserAccountInput): Promise<LockUserAccountResult> {
    const { userId, locked } = input;

    const user = await this.deps.userRepo.setLocked(userId, locked);

    if (!user) {
      throw new ErrorWithCode(ErrorCode.NotFound, `User ${userId} not found`);
    }

    if (locked) {
      await this.cancelWorkflowReminders(userId);
    } else {
      await this.deps.userUnblockService.clearWatchlistAndVerify({
        email: user.email,
        username: user.username || "",
      });
    }

    return { success: true, userId, locked };
  }

  private async cancelWorkflowReminders(userId: number): Promise<void> {
    const { workflowRemovalService, logger } = this.deps;

    try {
      const count = await workflowRemovalService.deleteAllWorkflowRemindersForUser(userId);

      if (count > 0) {
        logger.info(`Cancelled ${count} workflow reminders for locked user ${userId}`);
      }
    } catch (error) {
      logger.error(`Error cancelling workflow reminders for locked user ${userId}`, error);
    }
  }
}
