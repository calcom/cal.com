import { Module } from "@nestjs/common";
import { AppsRepository } from "@/modules/apps/apps.repository";
import { CredentialsRepository } from "@/modules/credentials/credentials.repository";
import { MembershipsRepository } from "@/modules/memberships/memberships.repository";
import { OrganizationsRepository } from "@/modules/organizations/index/organizations.repository";
import { OrganizationsTeamsRepository } from "@/modules/organizations/teams/index/organizations-teams.repository";
import { OrgTeamsVerifiedResourcesController } from "@/modules/organizations/teams/verified-resources/org-teams-verified-resources.controller";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { RedisModule } from "@/modules/redis/redis.module";
import { StripeService } from "@/modules/stripe/stripe.service";
import { TeamsVerifiedResourcesController } from "@/modules/teams/verified-resources/teams-verified-resources.controller";
import { UsersRepository } from "@/modules/users/users.repository";
import { UserVerifiedResourcesController } from "@/modules/verified-resources/controllers/users-verified-resources.controller";
import { VerifiedResourcesService } from "@/modules/verified-resources/services/verified-resources.service";
import { TeamsVerifiedResourcesRepository } from "@/modules/verified-resources/teams-verified-resources.repository";
import { UsersVerifiedResourcesRepository } from "@/modules/verified-resources/users-verified-resources.repository";

@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [
    UserVerifiedResourcesController,
    TeamsVerifiedResourcesController,
    OrgTeamsVerifiedResourcesController,
  ],
  providers: [
    VerifiedResourcesService,
    UsersVerifiedResourcesRepository,
    TeamsVerifiedResourcesRepository,
    MembershipsRepository,
    OrganizationsTeamsRepository,
    OrganizationsRepository,
    StripeService,
    AppsRepository,
    CredentialsRepository,
    UsersRepository,
  ],
  exports: [VerifiedResourcesService],
})
export class VerifiedResourcesModule {}
