import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";
import type { PrismaWebPushSubscriptionRepository } from "./prisma-web-push-subscription-repository";
import { parseBrowserSubscription } from "./web-push-subscription-schema";

export class WebPushSubscriptionService {
  constructor(private repository: PrismaWebPushSubscriptionRepository) {}

  async register(userId: number, subscriptionJson: string) {
    const parsed = parseBrowserSubscription(subscriptionJson);
    if (!parsed.success) {
      throw new ErrorWithCode(ErrorCode.BadRequest, "Invalid web-push subscription input");
    }

    const row = await this.repository.upsert(userId, parsed.data.endpoint, subscriptionJson);

    return { row, parsed: parsed.data };
  }

  async remove(userId: number, subscriptionJson: string) {
    const parsed = parseBrowserSubscription(subscriptionJson);
    if (!parsed.success) {
      throw new ErrorWithCode(ErrorCode.BadRequest, "Invalid web-push subscription input");
    }

    const result = await this.repository.removeByEndpoint(userId, parsed.data.endpoint);

    return { success: result.count > 0 };
  }
}
