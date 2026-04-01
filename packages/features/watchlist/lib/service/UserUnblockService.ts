import { sendEmailVerification } from "@calcom/features/auth/lib/verifyEmail";
import type { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import logger from "@calcom/lib/logger";

import { normalizeEmail } from "../utils/normalization";

const log = logger.getSubLogger({ prefix: ["UserUnblockService"] });

/** Minimal interface — accepts both GlobalWatchlistRepository and WatchlistRepository. */
export interface IWatchlistBlockLookup {
  findBlockedEmail(email: string): Promise<{ id: string } | null>;
  deleteEntry(id: string, ...args: unknown[]): Promise<void>;
}

type Deps = {
  watchlistRepo: IWatchlistBlockLookup;
  userRepo: UserRepository;
};

export class UserUnblockService {
  constructor(private deps: Deps) {}

  /**
   * Full unblock: unlock in DB + remove watchlist entry + send verification.
   * Use when triggered from the watchlist side (entry deleted, user may still be locked).
   */
  async unblockByEmail(email: string): Promise<void> {
    try {
      const user = await this.deps.userRepo.unlockByEmail({ email });
      if (user) {
        await this.clearWatchlistAndVerify({
          email: user.email,
          username: user.username || "",
        });
      }
    } catch (error) {
      log.error("Failed to unblock user by email", { email, error });
    }
  }

  /**
   * Partial unblock: remove watchlist entry + send verification.
   * Use when the user is already unlocked in DB (e.g. admin lock toggle).
   */
  async clearWatchlistAndVerify({
    email,
    username,
  }: {
    email: string;
    username: string;
  }): Promise<void> {
    const normalizedEmail = normalizeEmail(email);
    const entry = await this.deps.watchlistRepo.findBlockedEmail(
      normalizedEmail
    );
    if (entry) {
      await this.deps.watchlistRepo.deleteEntry(entry.id);
    }

    await sendEmailVerification({ email, username });
  }
}
