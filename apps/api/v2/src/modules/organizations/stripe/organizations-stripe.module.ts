import { AppsRepository } from "@/modules/apps/apps.repository";
import { AuthModule } from "@/modules/auth/auth.module";
import { CredentialsRepository } from "@/modules/credentials/credentials.repository";
import { MembershipsRepository } from "@/modules/memberships/memberships.repository";
import { OrganizationsRepository } from "@/modules/organizations/index/organizations.repository";
import { PlatformSubscriptionService } from "@/modules/organizations/platform-subscription/services/platform-subscription.service";
import { OrganizationsStripeController } from "@/modules/organizations/stripe/organizations-stripe.controller";
import { OrganizationsStripeService } from "@/modules/organizations/stripe/services/organizations-stripe.service";
import { OrganizationsTeamsRepository } from "@/modules/organizations/teams/index/organizations-teams.repository";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { RedisService } from "@/modules/redis/redis.service";
import { StripeService } from "@/modules/stripe/stripe.service";
import { UsersModule } from "@/modules/users/users.module";
import { forwardRef, Module } from "@nestjs/common";

@Module({
  imports: [UsersModule, PrismaModule, forwardRef(() => AuthModule)],
  providers: [
    RedisService,
    OrganizationsRepository,
    OrganizationsTeamsRepository,
    OrganizationsStripeService,
    CredentialsRepository,
    StripeService,
    PlatformSubscriptionService,
    AppsRepository,
    MembershipsRepository,
  ],
  controllers: [OrganizationsStripeController],
})
export class OrganizationsStripeModule {}
