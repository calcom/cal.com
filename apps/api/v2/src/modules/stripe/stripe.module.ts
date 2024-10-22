import { AppsRepository } from "@/modules/apps/apps.repository";
import { CredentialsRepository } from "@/modules/credentials/credentials.repository";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { StripeController } from "@/modules/stripe/controllers/stripe.controller";
import { StripeService } from "@/modules/stripe/stripe.service";
import { TokensRepository } from "@/modules/tokens/tokens.repository";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

@Module({
  imports: [ConfigModule, PrismaModule],
  exports: [StripeService],
  providers: [StripeService, AppsRepository, CredentialsRepository, TokensRepository],
  controllers: [StripeController],
})
export class StripeModule {}
