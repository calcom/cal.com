import type {
  RegisterAppPushSubscriptionInput,
  RemoveAppPushSubscriptionInput,
} from "@calcom/platform-libraries";
import { AppPushSubscriptionRepository, AppPushSubscriptionService } from "@calcom/platform-libraries";
import { Injectable } from "@nestjs/common";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";

@Injectable()
export class NotificationsSubscriptionsService {
  private appPushService: AppPushSubscriptionService;

  constructor(private readonly dbWrite: PrismaWriteService) {
    const repository = new AppPushSubscriptionRepository(this.dbWrite.prisma);
    this.appPushService = new AppPushSubscriptionService(repository);
  }

  async registerAppPush(userId: number, input: RegisterAppPushSubscriptionInput) {
    return this.appPushService.register(userId, input);
  }

  async removeAppPush(userId: number, input: RemoveAppPushSubscriptionInput) {
    return this.appPushService.remove(userId, input);
  }
}
