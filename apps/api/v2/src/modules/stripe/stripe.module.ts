import { AppsRepository } from "@/modules/apps/apps.repository";
import { CredentialsRepository } from "@/modules/credentials/credentials.repository";
import { MembershipsRepository } from "@/modules/memberships/memberships.repository";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { StripeController } from "@/modules/stripe/controllers/stripe.controller";
import { StripeService } from "@/modules/stripe/stripe.service";
import { TokensRepository } from "@/modules/tokens/tokens.repository";
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
