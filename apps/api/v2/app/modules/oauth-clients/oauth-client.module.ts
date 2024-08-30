import { Global, Module } from "@nestjs/common";
import { EventTypesModule_2024_04_15 } from "app/ee/event-types/event-types_2024_04_15/event-types.module";
import { SchedulesModule_2024_04_15 } from "app/ee/schedules/schedules_2024_04_15/schedules.module";
import { AuthModule } from "app/modules/auth/auth.module";
import { BillingModule } from "app/modules/billing/billing.module";
import { MembershipsModule } from "app/modules/memberships/memberships.module";
import { OAuthClientUsersController } from "app/modules/oauth-clients/controllers/oauth-client-users/oauth-client-users.controller";
import { OAuthClientsController } from "app/modules/oauth-clients/controllers/oauth-clients/oauth-clients.controller";
import { OAuthFlowController } from "app/modules/oauth-clients/controllers/oauth-flow/oauth-flow.controller";
import { OAuthClientRepository } from "app/modules/oauth-clients/oauth-client.repository";
import { OAuthClientUsersService } from "app/modules/oauth-clients/services/oauth-clients-users.service";
import { OAuthFlowService } from "app/modules/oauth-clients/services/oauth-flow.service";
import { OrganizationsModule } from "app/modules/organizations/organizations.module";
import { OrganizationsTeamsService } from "app/modules/organizations/services/organizations-teams.service";
import { PrismaModule } from "app/modules/prisma/prisma.module";
import { RedisModule } from "app/modules/redis/redis.module";
import { StripeModule } from "app/modules/stripe/stripe.module";
import { TokensModule } from "app/modules/tokens/tokens.module";
import { TokensRepository } from "app/modules/tokens/tokens.repository";
import { UsersModule } from "app/modules/users/users.module";

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
