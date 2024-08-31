import { Global, Module } from "@nestjs/common";
import { EventTypesModule_2024_04_15 } from "src/ee/event-types/event-types_2024_04_15/event-types.module";
import { SchedulesModule_2024_04_15 } from "src/ee/schedules/schedules_2024_04_15/schedules.module";
import { AuthModule } from "src/modules/auth/auth.module";
import { BillingModule } from "src/modules/billing/billing.module";
import { MembershipsModule } from "src/modules/memberships/memberships.module";
import { OAuthClientUsersController } from "src/modules/oauth-clients/controllers/oauth-client-users/oauth-client-users.controller";
import { OAuthClientsController } from "src/modules/oauth-clients/controllers/oauth-clients/oauth-clients.controller";
import { OAuthFlowController } from "src/modules/oauth-clients/controllers/oauth-flow/oauth-flow.controller";
import { OAuthClientRepository } from "src/modules/oauth-clients/oauth-client.repository";
import { OAuthClientUsersService } from "src/modules/oauth-clients/services/oauth-clients-users.service";
import { OAuthFlowService } from "src/modules/oauth-clients/services/oauth-flow.service";
import { OrganizationsModule } from "src/modules/organizations/organizations.module";
import { OrganizationsTeamsService } from "src/modules/organizations/services/organizations-teams.service";
import { PrismaModule } from "src/modules/prisma/prisma.module";
import { RedisModule } from "src/modules/redis/redis.module";
import { StripeModule } from "src/modules/stripe/stripe.module";
import { TokensModule } from "src/modules/tokens/tokens.module";
import { TokensRepository } from "src/modules/tokens/tokens.repository";
import { UsersModule } from "src/modules/users/users.module";

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
