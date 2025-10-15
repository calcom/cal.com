import { MembershipsModule } from "@/modules/memberships/memberships.module";
import { OrganizationsRepository } from "@/modules/organizations/index/organizations.repository";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { RedisModule } from "@/modules/redis/redis.module";
import { StripeModule } from "@/modules/stripe/stripe.module";
import { Module } from "@nestjs/common";

import { RoleService } from "@calcom/platform-libraries/pbac";

import { RolesPermissionsOutputService } from "./permissions/services/roles-permissions-output.service";
import { RolesPermissionsService } from "./permissions/services/roles-permissions.service";
import { RolesOutputService } from "./services/roles-output.service";
import { RolesService } from "./services/roles.service";

@Module({
  imports: [StripeModule, PrismaModule, RedisModule, MembershipsModule],
  providers: [
    OrganizationsRepository,
    {
      provide: RoleService,
      useFactory: () => new RoleService(),
    },
    RolesService,
    RolesOutputService,
    RolesPermissionsService,
    RolesPermissionsOutputService,
  ],
  exports: [RolesService, RolesOutputService, RolesPermissionsService, RolesPermissionsOutputService],
})
export class RolesModule {}
