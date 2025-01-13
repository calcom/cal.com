import { EventTypesModule_2024_04_15 } from "@/ee/event-types/event-types_2024_04_15/event-types.module";
import { SchedulesModule_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/schedules.module";
import { AuthModule } from "@/modules/auth/auth.module";
import { BillingModule } from "@/modules/billing/billing.module";
import { MembershipsModule } from "@/modules/memberships/memberships.module";
import { OAuthClientUsersController } from "@/modules/oauth-clients/controllers/oauth-client-users/oauth-client-users.controller";
import { OAuthClientsController } from "@/modules/oauth-clients/controllers/oauth-clients/oauth-clients.controller";
import { OAuthFlowController } from "@/modules/oauth-clients/controllers/oauth-flow/oauth-flow.controller";
import { OAuthClientRepository } from "@/modules/oauth-clients/oauth-client.repository";
import { OAuthClientUsersService } from "@/modules/oauth-clients/services/oauth-clients-users.service";
import { OAuthFlowService } from "@/modules/oauth-clients/services/oauth-flow.service";
import { OrganizationsModule } from "@/modules/organizations/organizations.module";
import { OrganizationsTeamsService } from "@/modules/organizations/services/organizations-teams.service";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { RedisModule } from "@/modules/redis/redis.module";
import { StripeModule } from "@/modules/stripe/stripe.module";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { TokensRepository } from "@/modules/tokens/tokens.repository";
import { UsersModule } from "@/modules/users/users.module";
import { Global, Module } from "@nestjs/common";

@Global()
@Module({
  imports: [
    PrismaModule,
    RedisModule,
    AuthModule,
    UsersModule,
    TokensModule,
    MembershipsModule,
    EventTypesModule_2024_04_15,
    OrganizationsModule,
    StripeModule,
    BillingModule,
    SchedulesModule_2024_04_15,
  ],
  providers: [
    OAuthClientRepository,
    TokensRepository,
    OAuthFlowService,
    OAuthClientUsersService,
    OrganizationsTeamsService,
  ],
  controllers: [OAuthClientUsersController, OAuthClientsController, OAuthFlowController],
  exports: [OAuthClientRepository],
})
export class OAuthClientModule {}
