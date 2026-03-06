import { OrganizationMembershipService } from "@/lib/services/organization-membership.service";
import { MembershipsModule } from "@/modules/memberships/memberships.module";
import { OAuthClientRepository } from "@/modules/oauth-clients/oauth-client.repository";
import { OrganizationsRepository } from "@/modules/organizations/index/organizations.repository";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { RedisModule } from "@/modules/redis/redis.module";
import { StripeModule } from "@/modules/stripe/stripe.module";
import { TeamsMembershipsRepository } from "@/modules/teams/memberships/teams-memberships.repository";
import { TeamsController } from "@/modules/teams/teams/controllers/teams.controller";
import { TeamsService } from "@/modules/teams/teams/services/teams.service";
import { TeamsRepository } from "@/modules/teams/teams/teams.repository";
import { UsersRepository } from "@/modules/users/users.repository";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaModule, MembershipsModule, RedisModule, StripeModule],
  providers: [
    TeamsRepository,
    TeamsService,
    TeamsMembershipsRepository,
    OAuthClientRepository,
    UsersRepository,
    OrganizationsRepository,
    OrganizationMembershipService,
  ],
  controllers: [TeamsController],
  exports: [TeamsRepository],
})
export class TeamsModule {}
