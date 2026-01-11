import { MembershipsModule } from "@/modules/memberships/memberships.module";
import { OrganizationsRepository } from "@/modules/organizations/index/organizations.repository";
import { OrganizationsRolesPermissionsController } from "@/modules/organizations/roles/permissions/organizations-roles-permissions.controller";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { RedisModule } from "@/modules/redis/redis.module";
import { RolesModule } from "@/modules/roles/roles.module";
import { StripeModule } from "@/modules/stripe/stripe.module";
import { Module } from "@nestjs/common";

import { OrganizationsRolesController } from "./organizations-roles.controller";

@Module({
  imports: [StripeModule, PrismaModule, RedisModule, MembershipsModule, RolesModule],
  providers: [OrganizationsRepository],
  controllers: [OrganizationsRolesController, OrganizationsRolesPermissionsController],
})
export class OrganizationsRolesModule {}
