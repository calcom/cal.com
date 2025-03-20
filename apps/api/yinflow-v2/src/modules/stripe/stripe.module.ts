import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { AppsRepository } from "../apps/apps.repository";
import { CredentialsRepository } from "../credentials/credentials.repository";
import { MembershipsRepository } from "../memberships/memberships.repository";
import { PrismaModule } from "../prisma/prisma.module";
import { StripeController } from "../stripe/controllers/stripe.controller";
import { StripeService } from "../stripe/stripe.service";
import { TokensRepository } from "../tokens/tokens.repository";
import { UsersModule } from "../users/users.module";

@Module({
  imports: [ConfigModule, PrismaModule, UsersModule],
  exports: [StripeService],
  providers: [StripeService, AppsRepository, CredentialsRepository, TokensRepository, MembershipsRepository],
  controllers: [StripeController],
})
export class StripeModule {}
