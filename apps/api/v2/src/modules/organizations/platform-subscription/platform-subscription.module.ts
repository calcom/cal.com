import { AuthModule } from "@/modules/auth/auth.module";
import { Module } from "@nestjs/common";
import { forwardRef } from "@nestjs/common";

import { PlatformSubscriptionService } from "./services/platform-subscription.service";

@Module({
  imports: [forwardRef(() => AuthModule)],
  providers: [PlatformSubscriptionService],
  exports: [PlatformSubscriptionService],
})
export class PlatformSubscriptionModule {}
