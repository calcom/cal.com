import { Module } from "@nestjs/common";

import { ApiKeysModule } from "../../api-keys/api-keys.module";
import { ManagedOrganizationsBillingService } from "../../billing/services/managed-organizations.billing.service";
import { MembershipsModule } from "../../memberships/memberships.module";
import { OrganizationsRepository } from "../../organizations/index/organizations.repository";
import { OrganizationsMembershipRepository } from "../../organizations/memberships/organizations-membership.repository";
import { OrganizationsMembershipService } from "../../organizations/memberships/services/organizations-membership.service";
import { ManagedOrganizationsRepository } from "../../organizations/organizations/managed-organizations.repository";
import { OrganizationsOrganizationsController } from "../../organizations/organizations/organizations-organizations.controller";
import { ManagedOrganizationsOutputService } from "../../organizations/organizations/services/managed-organizations-output.service";
import { ManagedOrganizationsService } from "../../organizations/organizations/services/managed-organizations.service";
import { PrismaModule } from "../../prisma/prisma.module";
import { ProfilesModule } from "../../profiles/profiles.module";
import { RedisModule } from "../../redis/redis.module";
import { StripeModule } from "../../stripe/stripe.module";

@Module({
  imports: [PrismaModule, RedisModule, StripeModule, MembershipsModule, ApiKeysModule, ProfilesModule],
  providers: [
    ManagedOrganizationsService,
    ManagedOrganizationsRepository,
    ManagedOrganizationsBillingService,
    OrganizationsRepository,
    OrganizationsMembershipService,
    OrganizationsMembershipRepository,
    ManagedOrganizationsOutputService,
  ],
  controllers: [OrganizationsOrganizationsController],
})
export class OrganizationsOrganizationsModule {}
