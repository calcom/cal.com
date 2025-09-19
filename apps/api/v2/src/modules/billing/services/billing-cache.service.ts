import { RedisService } from "@/modules/redis/redis.service";
import { Injectable } from "@nestjs/common";

export const REDIS_BILLING_CACHE_KEY = (teamId: number) => `apiv2:team:${teamId}:billing`;
export const BILLING_CACHE_TTL_MS = 3_600_000; // 1 hour

type BillingData = {
  team: any;
  status: "valid" | "no_subscription" | "no_billing";
  plan: string;
};

@Injectable()
export class BillingCacheService {
  constructor(private readonly redisService: RedisService) {}

  async deleteBillingCache(teamId: number) {
    await this.redisService.del(REDIS_BILLING_CACHE_KEY(teamId));
  }

  async getBillingCache(teamId: number) {
    const cachedResult = await this.redisService.get<BillingData>(REDIS_BILLING_CACHE_KEY(teamId));
    return cachedResult;
  }

  async setBillingCache(teamId: number, billingData: BillingData): Promise<void> {
    await this.redisService.set<BillingData>(REDIS_BILLING_CACHE_KEY(teamId), billingData, {
      ttl: BILLING_CACHE_TTL_MS,
    });
  }
}
