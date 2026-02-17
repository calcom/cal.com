import { Memoize } from "@calcom/features/cache";
import { z } from "zod";
import type { ActiveUserBillingRepository } from "./ActiveUserBillingRepository";

const CACHE_PREFIX = "active-user-billing:lastActive";
const KEY = {
  lastActiveAt: (userId: number, _email: string): string => `${CACHE_PREFIX}:${userId}`,
};

export class CachedActiveUserBillingRepository {
  constructor(private activeUserBillingRepository: ActiveUserBillingRepository) {}

  @Memoize({
    key: KEY.lastActiveAt,
    schema: z.coerce.date().nullable(),
  })
  async getLastActiveAt(userId: number, email: string): Promise<Date | null> {
    return this.activeUserBillingRepository.getLastActiveAt(userId, email);
  }
}
