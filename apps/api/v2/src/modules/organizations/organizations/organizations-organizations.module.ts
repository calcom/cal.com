import { ApiKeysModule } from "@/modules/api-keys/api-keys.module";
import { ManagedOrganizationsBillingService } from "@/modules/billing/services/managedOrganizationsBillingService";
import { MembershipsModule } from "@/modules/memberships/memberships.module";
import { MembershipsRepository } from "@/modules/memberships/membershipsRepository";
import { OrganizationsRepository } from "@/modules/organizations/index/organizationsRepository";
import { OrganizationsMembershipRepository } from "@/modules/organizations/memberships/organizationsMembershipRepository";
import { OrganizationsMembershipOutputService } from "@/modules/organizations/memberships/services/organizationsMembershipOutputService";
import { OrganizationsMembershipService } from "@/modules/organizations/memberships/services/organizationsMembershipService";
import { ManagedOrganizationsRepository } from "@/modules/organizations/organizations/managedOrganizationsRepository";
import { OrganizationsOrganizationsController } from "@/modules/organizations/organizations/organizations-organizations.controller";
import { ManagedOrganizationsOutputService } from "@/modules/organizations/organizations/services/managedOrganizationsOutputService";
import { ManagedOrganizationsService } from "@/modules/organizations/organizations/services/managedOrganizationsService";
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
