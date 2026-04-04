import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";
import type { AppPushSubscriptionRepository } from "./app-push-subscription-repository";
import type {
  RegisterAppPushSubscriptionInput,
  RemoveAppPushSubscriptionInput,
} from "./app-push-subscription-schema";
import {
  registerAppPushSubscriptionSchema,
  removeAppPushSubscriptionSchema,
} from "./app-push-subscription-schema";

export class AppPushSubscriptionService {
  constructor(private repository: AppPushSubscriptionRepository) {}

  async register(userId: number, input: RegisterAppPushSubscriptionInput) {
    const parsed = registerAppPushSubscriptionSchema.safeParse(input);
    if (!parsed.success) {
      throw new ErrorWithCode(
        ErrorCode.BadRequest,
        `Invalid app-push subscription input: ${parsed.error.message}`
      );
    }

    return this.repository.upsert(userId, parsed.data);
  }

  async remove(userId: number, input: RemoveAppPushSubscriptionInput) {
    const parsed = removeAppPushSubscriptionSchema.safeParse(input);
    if (!parsed.success) {
      throw new ErrorWithCode(
        ErrorCode.BadRequest,
        `Invalid app-push removal input: ${parsed.error.message}`
      );
    }

    const result = await this.repository.removeByToken(userId, parsed.data.token);

    return { success: result.count > 0 };
  }
}
