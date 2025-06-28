import { ApiKeysModule } from "@/modules/api-keys/api-keys.module";
import { ManagedOrganizationsBillingService } from "@/modules/billing/services/managed-organizations.billing.service";
import { MembershipsModule } from "@/modules/memberships/memberships.module";
import { MembershipsRepository } from "@/modules/memberships/memberships.repository";
import { OrganizationsRepository } from "@/modules/organizations/index/organizations.repository";
import { OrganizationsMembershipRepository } from "@/modules/organizations/memberships/organizations-membership.repository";
import { OrganizationsMembershipOutputService } from "@/modules/organizations/memberships/services/organizations-membership-output.service";
import { OrganizationsMembershipService } from "@/modules/organizations/memberships/services/organizations-membership.service";
import { ManagedOrganizationsRepository } from "@/modules/organizations/organizations/managed-organizations.repository";
import { OrganizationsOrganizationsController } from "@/modules/organizations/organizations/organizations-organizations.controller";
import { ManagedOrganizationsOutputService } from "@/modules/organizations/organizations/services/managed-organizations-output.service";
import { ManagedOrganizationsService } from "@/modules/organizations/organizations/services/managed-organizations.service";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { ProfilesModule } from "@/modules/profiles/profiles.module";
import { RedisModule } from "@/modules/redis/redis.module";
import { StripeModule } from "@/modules/stripe/stripe.module";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaModule, RedisModule, StripeModule, MembershipsModule, ApiKeysModule, ProfilesModule],
  providers: [
    ManagedOrganizationsService,
    ManagedOrganizationsRepository,
    ManagedOrganizationsBillingService,
    OrganizationsRepository,
    OrganizationsMembershipService,
    OrganizationsMembershipOutputService,
    OrganizationsMembershipRepository,
    ManagedOrganizationsOutputService,
  ],
  controllers: [OrganizationsOrganizationsController],
})
export class OrganizationsOrganizationsModule {}
