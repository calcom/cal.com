import { AppsRepository } from "@/modules/apps/appsRepository";
import { CredentialsRepository } from "@/modules/credentials/credentialsRepository";
import { MembershipsRepository } from "@/modules/memberships/membershipsRepository";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { StripeController } from "@/modules/stripe/controllers/stripe.controller";
import { StripeService } from "@/modules/stripe/stripeService";
import { TokensRepository } from "@/modules/tokens/tokensRepository";
import { UsersModule } from "@/modules/users/users.module";
import { HttpModule } from "@nestjs/axios";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

@Module({
  imports: [ConfigModule, PrismaModule, UsersModule, HttpModule],
  exports: [StripeService],
  providers: [StripeService, AppsRepository, CredentialsRepository, TokensRepository, MembershipsRepository],
  controllers: [StripeController],
})
export class StripeModule {}
