import { MembershipsModule } from "@/modules/memberships/memberships.module";
import { OrganizationsRepository } from "@/modules/organizations/index/organizations.repository";
import { OrganizationsTeamsRepository } from "@/modules/organizations/teams/index/organizations-teams.repository";
import { OrganizationsTeamsRolesPermissionsController } from "@/modules/organizations/teams/roles/permissions/organizations-teams-roles-permissions.controller";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { RedisModule } from "@/modules/redis/redis.module";
import { RolesModule } from "@/modules/roles/roles.module";
import { StripeModule } from "@/modules/stripe/stripe.module";
import { Module } from "@nestjs/common";

import { OrganizationsTeamsRolesController } from "./organizations-teams-roles.controller";

@Module({
  imports: [StripeModule, PrismaModule, RedisModule, MembershipsModule, RolesModule],
  providers: [OrganizationsRepository, OrganizationsTeamsRepository],
  controllers: [OrganizationsTeamsRolesController, OrganizationsTeamsRolesPermissionsController],
})
export class OrganizationsTeamsRolesModule {}
