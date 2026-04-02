import { RoleService } from "@calcom/platform-libraries/pbac";
import { Module } from "@nestjs/common";
import { TeamRolesOutputService } from "../organizations/teams/roles/services/team-roles-output.service";
import { RolesPermissionsService } from "./permissions/services/roles-permissions.service";
import { RolesPermissionsCacheService } from "./permissions/services/roles-permissions-cache.service";
import { RolesPermissionsOutputService } from "./permissions/services/roles-permissions-output.service";
import { RolesService } from "./services/roles.service";
import { MembershipsModule } from "@/modules/memberships/memberships.module";
import { OrganizationsRolesOutputService } from "@/modules/organizations/roles/services/organizations-roles-output.service";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { RedisModule } from "@/modules/redis/redis.module";
import { StripeModule } from "@/modules/stripe/stripe.module";

@Module({
  imports: [StripeModule, PrismaModule, RedisModule, MembershipsModule],
  providers: [
    {
      provide: RoleService,
      useFactory: () => new RoleService(),
    },
    RolesService,
    TeamRolesOutputService,
    OrganizationsRolesOutputService,
    RolesPermissionsService,
    RolesPermissionsOutputService,
    RolesPermissionsCacheService,
  ],
  exports: [
    RolesService,
    TeamRolesOutputService,
    OrganizationsRolesOutputService,
    RolesPermissionsService,
    RolesPermissionsOutputService,
    RolesPermissionsCacheService,
  ],
})
export class RolesModule {}
