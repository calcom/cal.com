import { AppsRepository } from "@/modules/apps/appsRepository";
import { CredentialsRepository } from "@/modules/credentials/credentialsRepository";
import { MembershipsRepository } from "@/modules/memberships/membershipsRepository";
import { OrganizationsRepository } from "@/modules/organizations/index/organizationsRepository";
import { OrganizationsStripeController } from "@/modules/organizations/stripe/organizations-stripe.controller";
import { OrganizationsStripeService } from "@/modules/organizations/stripe/services/organizationsStripeService";
import { OrganizationsTeamsRepository } from "@/modules/organizations/teams/index/organizationsTeamsRepository";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { RedisService } from "@/modules/redis/redisService";
import { StripeModule } from "@/modules/stripe/stripe.module";
import { TokensRepository } from "@/modules/tokens/tokensRepository";
import { Module } from "@nestjs/common";

@Module({
  imports: [StripeModule, PrismaModule],
  exports: [OrganizationsStripeService],
  providers: [
    OrganizationsStripeService,
    CredentialsRepository,
    AppsRepository,
    RedisService,
    OrganizationsRepository,
    MembershipsRepository,
    OrganizationsTeamsRepository,
    TokensRepository,
  ],
  controllers: [OrganizationsStripeController],
})
export class OrganizationsStripeModule {}
