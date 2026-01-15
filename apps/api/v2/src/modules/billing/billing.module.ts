import { BookingsRepository_2024_08_13 } from "@/ee/bookings/2024-08-13/repositories/bookings.repository";
import { BillingProcessor } from "@/modules/billing/billing.processor";
import { BillingRepository } from "@/modules/billing/billing.repository";
import { BillingController } from "@/modules/billing/controllers/billing.controller";
import { IsUserInBillingOrg } from "@/modules/billing/guards/is-user-in-billing-org";
import { BillingServiceCachingProxy } from "@/modules/billing/services/billing-service-caching-proxy";
import { BillingConfigService } from "@/modules/billing/services/billing.config.service";
import { BillingService } from "@/modules/billing/services/billing.service";
import { ManagedOrganizationsBillingService } from "@/modules/billing/services/managed-organizations.billing.service";
import { MembershipsModule } from "@/modules/memberships/memberships.module";
import { OAuthClientRepository } from "@/modules/oauth-clients/oauth-client.repository";
import { OrganizationsModule } from "@/modules/organizations/organizations.module";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { RedisModule } from "@/modules/redis/redis.module";
import { StripeModule } from "@/modules/stripe/stripe.module";
import { UsersModule } from "@/modules/users/users.module";
import { BullModule } from "@nestjs/bull";
import { Module } from "@nestjs/common";

@Module({
  imports: [
    PrismaModule,
    StripeModule,
    RedisModule,
    MembershipsModule,
    OrganizationsModule,
    BullModule.registerQueue({
      name: "billing",
      limiter: {
        max: 1,
        duration: 1000,
      },
    }),
    UsersModule,
  ],
  providers: [
    BillingConfigService,
    BillingService,
    {
      provide: "IBillingService",
      useClass: BillingServiceCachingProxy,
    },
    BillingRepository,
    BillingProcessor,
    ManagedOrganizationsBillingService,
    OAuthClientRepository,
    BookingsRepository_2024_08_13,
    IsUserInBillingOrg,
  ],
  exports: [BillingService, BillingRepository, ManagedOrganizationsBillingService],
  controllers: [BillingController],
})
export class BillingModule {}
