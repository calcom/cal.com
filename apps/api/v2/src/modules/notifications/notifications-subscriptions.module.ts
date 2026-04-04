import { Module } from "@nestjs/common";
import { NotificationsSubscriptionsController } from "@/modules/notifications/controllers/notifications-subscriptions.controller";
import { NotificationsSubscriptionsService } from "@/modules/notifications/services/notifications-subscriptions.service";
import { PrismaModule } from "@/modules/prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [NotificationsSubscriptionsController],
  providers: [NotificationsSubscriptionsService],
  exports: [NotificationsSubscriptionsService],
})
export class NotificationsSubscriptionsModule {}
