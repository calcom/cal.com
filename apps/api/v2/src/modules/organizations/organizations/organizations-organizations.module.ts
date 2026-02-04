import { BullModule } from "@nestjs/bull";
import { Module } from "@nestjs/common";
import { CALENDARS_QUEUE } from "@/ee/calendars/processors/calendars.processor";
import { CalendarsTaskerModule } from "@/lib/modules/calendars-tasker.module";
import { ApiKeysModule } from "@/modules/api-keys/api-keys.module";
import { ManagedOrganizationsBillingService } from "@/modules/billing/services/managed-organizations.billing.service";
import { MembershipsModule } from "@/modules/memberships/memberships.module";
import { OrganizationsDelegationCredentialRepository } from "@/modules/organizations/delegation-credentials/organizations-delegation-credential.repository";
import { OrganizationsDelegationCredentialService } from "@/modules/organizations/delegation-credentials/services/organizations-delegation-credential.service";
import { OrganizationsRepository } from "@/modules/organizations/index/organizations.repository";
import { OrganizationsMembershipRepository } from "@/modules/organizations/memberships/organizations-membership.repository";
import { OrganizationsMembershipService } from "@/modules/organizations/memberships/services/organizations-membership.service";
import { OrganizationsMembershipOutputService } from "@/modules/organizations/memberships/services/organizations-membership-output.service";
import { ManagedOrganizationsRepository } from "@/modules/organizations/organizations/managed-organizations.repository";
import { OrganizationsOrganizationsController } from "@/modules/organizations/organizations/organizations-organizations.controller";
import { ManagedOrganizationsService } from "@/modules/organizations/organizations/services/managed-organizations.service";
import { ManagedOrganizationsOutputService } from "@/modules/organizations/organizations/services/managed-organizations-output.service";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { ProfilesModule } from "@/modules/profiles/profiles.module";
import { RedisModule } from "@/modules/redis/redis.module";
import { StripeModule } from "@/modules/stripe/stripe.module";
import { UsersRepository } from "@/modules/users/users.repository";

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    StripeModule,
    MembershipsModule,
    ApiKeysModule,
    ProfilesModule,
    BullModule.registerQueue({
      name: CALENDARS_QUEUE,
      limiter: {
        max: 1,
        duration: 1000,
      },
    }),
    CalendarsTaskerModule,
  ],
  providers: [
    ManagedOrganizationsService,
    ManagedOrganizationsRepository,
    ManagedOrganizationsBillingService,
    OrganizationsRepository,
    UsersRepository,
    OrganizationsDelegationCredentialRepository,
    OrganizationsDelegationCredentialService,
    OrganizationsMembershipService,
    OrganizationsMembershipOutputService,
    OrganizationsMembershipRepository,
    ManagedOrganizationsOutputService,
  ],
  controllers: [OrganizationsOrganizationsController],
})
export class OrganizationsOrganizationsModule {}
