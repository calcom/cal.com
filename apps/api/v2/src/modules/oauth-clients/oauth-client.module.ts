import { Global, Module } from "@nestjs/common";

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
import { OAuthFlowService } from "../oauth-clients/services/oauth-flow.service";
import { OrganizationsModule } from "../organizations/organizations.module";
import { OrganizationsTeamsService } from "../organizations/services/organizations-teams.service";
import { StripeModule } from "../stripe/stripe.module";
import { TokensModule } from "../tokens/tokens.module";
import { TokensRepository } from "../tokens/tokens.repository";
import { UsersModule } from "../users/users.module";

@Global()
@Module({
  imports: [
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
