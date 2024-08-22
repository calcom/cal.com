import { AppsRepository } from "@/modules/apps/apps.repository";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { StripeService } from "@/modules/stripe/stripe.service";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

@Module({
  imports: [ConfigModule, PrismaModule],
  exports: [StripeService],
  providers: [StripeService, AppsRepository],
})
export class StripeModule {}
