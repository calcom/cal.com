import { AppsRepository } from "@/modules/apps/apps.repository";
import { CredentialsRepository } from "@/modules/credentials/credentials.repository";
import { MembershipsRepository } from "@/modules/memberships/memberships.repository";
import { OrganizationsRepository } from "@/modules/organizations/index/organizations.repository";
import { OrganizationsStripeController } from "@/modules/organizations/stripe/organizations-stripe.controller";
import { OrganizationsStripeService } from "@/modules/organizations/stripe/services/organizations-stripe.service";
import { OrganizationsTeamsRepository } from "@/modules/organizations/teams/index/organizations-teams.repository";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { RedisService } from "@/modules/redis/redis.service";
import { StripeModule } from "@/modules/stripe/stripe.module";
import { TokensRepository } from "@/modules/tokens/tokens.repository";
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
