import { MembershipsModule } from "@/modules/memberships/memberships.module";
import { OrganizationsRepository } from "@/modules/organizations/index/organizations.repository";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { RedisModule } from "@/modules/redis/redis.module";
import { StripeModule } from "@/modules/stripe/stripe.module";
import { Module } from "@nestjs/common";

import { RoleService } from "@calcom/platform-libraries/pbac";

import { OrganizationsRolesPermissionsController } from "./controllers/organizations-roles-permissions.controller";
import { OrganizationsRolesController } from "./controllers/organizations-roles.controller";
import { OrganizationsRolesOutputService } from "./services/organizations-roles-output.service";
import { OrganizationsRolesService } from "./services/organizations-roles.service";
import { RolePermissionsService } from "./services/role-permissions.service";

@Module({
  imports: [StripeModule, PrismaModule, RedisModule, MembershipsModule],
  providers: [
    OrganizationsRepository,
    {
      provide: RoleService,
      useFactory: () => new RoleService(),
    },
    OrganizationsRolesService,
    OrganizationsRolesOutputService,
    RolePermissionsService,
  ],
  controllers: [OrganizationsRolesController, OrganizationsRolesPermissionsController],
  exports: [OrganizationsRolesService],
})
export class OrganizationsRolesModule {}
