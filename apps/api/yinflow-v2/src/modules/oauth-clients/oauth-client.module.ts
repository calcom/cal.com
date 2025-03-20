import { Global, Module } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

import { EventTypesModule_2024_04_15 } from "../../ee/event-types/event-types_2024_04_15/event-types.module";
import { SchedulesModule_2024_04_15 } from "../../ee/schedules/schedules_2024_04_15/schedules.module";
import { AuthModule } from "../auth/auth.module";
import { BillingModule } from "../billing/billing.module";
import { MembershipsModule } from "../memberships/memberships.module";
import { OAuthClientUsersController } from "../oauth-clients/controllers/oauth-client-users/oauth-client-users.controller";
import { OAuthClientsController } from "../oauth-clients/controllers/oauth-clients/oauth-clients.controller";
import { OAuthFlowController } from "../oauth-clients/controllers/oauth-flow/oauth-flow.controller";
import { OAuthClientRepository } from "../oauth-clients/oauth-client.repository";
import { OAuthClientUsersService } from "../oauth-clients/services/oauth-clients-users.service";
import { OAuthClientsInputService } from "../oauth-clients/services/oauth-clients/oauth-clients-input.service";
import { OAuthClientsOutputService } from "../oauth-clients/services/oauth-clients/oauth-clients-output.service";
import { OAuthClientsService } from "../oauth-clients/services/oauth-clients/oauth-clients.service";
import { OAuthFlowService } from "../oauth-clients/services/oauth-flow.service";
import { OrganizationsModule } from "../organizations/organizations.module";
import { OrganizationsTeamsService } from "../organizations/teams/index/services/organizations-teams.service";
import { PrismaModule } from "../prisma/prisma.module";
import { RedisModule } from "../redis/redis.module";
import { StripeModule } from "../stripe/stripe.module";
import { TokensModule } from "../tokens/tokens.module";
import { TokensRepository } from "../tokens/tokens.repository";
import { UsersModule } from "../users/users.module";

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
    OAuthClientsService,
    OAuthClientsInputService,
    OAuthClientsOutputService,
    JwtService,
  ],
  controllers: [OAuthClientUsersController, OAuthClientsController, OAuthFlowController],
  exports: [OAuthClientRepository],
})
export class OAuthClientModule {}
