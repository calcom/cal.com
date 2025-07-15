import { CalendarsRepository } from "@/ee/calendars/calendarsRepository";
import { CalendarsService } from "@/ee/calendars/services/calendarsService";
import { EventTypesModule_2024_04_15 } from "@/ee/event-types/event-types_2024_04_15/event-types.module";
import { SchedulesModule_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/schedules.module";
import { AppsRepository } from "@/modules/apps/appsRepository";
import { AuthModule } from "@/modules/auth/auth.module";
import { BillingModule } from "@/modules/billing/billing.module";
import { CredentialsRepository } from "@/modules/credentials/credentialsRepository";
import { MembershipsModule } from "@/modules/memberships/memberships.module";
import { OAuthClientUsersController } from "@/modules/oauth-clients/controllers/oauth-client-users/oauth-client-users.controller";
import { OAuthClientsController } from "@/modules/oauth-clients/controllers/oauth-clients/oauth-clients.controller";
import { OAuthFlowController } from "@/modules/oauth-clients/controllers/oauth-flow/oauth-flow.controller";
import { OAuthClientRepository } from "@/modules/oauth-clients/oauthClientRepository";
import { OAuthClientsInputService } from "@/modules/oauth-clients/services/oauth-clients/oauthClientsInputService";
import { OAuthClientsOutputService } from "@/modules/oauth-clients/services/oauth-clients/oauthClientsOutputService";
import { OAuthClientsService } from "@/modules/oauth-clients/services/oauth-clients/oauthClientsService";
import { OAuthClientUsersOutputService } from "@/modules/oauth-clients/services/oauthClientsUsersOutputService";
import { OAuthClientUsersService } from "@/modules/oauth-clients/services/oauthClientsUsersService";
import { OAuthFlowService } from "@/modules/oauth-clients/services/oauthFlowService";
import { OrganizationsModule } from "@/modules/organizations/organizations.module";
import { OrganizationsTeamsService } from "@/modules/organizations/teams/index/services/organizationsTeamsService";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { RedisModule } from "@/modules/redis/redis.module";
import { SelectedCalendarsRepository } from "@/modules/selected-calendars/selectedCalendarsRepository";
import { StripeModule } from "@/modules/stripe/stripe.module";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { TokensRepository } from "@/modules/tokens/tokensRepository";
import { UsersModule } from "@/modules/users/users.module";
import { Global, Module } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

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
    CalendarsService,
    CredentialsRepository,
    AppsRepository,
    CalendarsRepository,
    SelectedCalendarsRepository,
    OAuthClientUsersService,
    OrganizationsTeamsService,
    OAuthClientsService,
    OAuthClientsInputService,
    OAuthClientsOutputService,
    JwtService,
    OAuthClientUsersOutputService,
  ],
  controllers: [OAuthClientUsersController, OAuthClientsController, OAuthFlowController],
  exports: [OAuthClientRepository, OAuthClientsOutputService, OAuthClientUsersOutputService],
})
export class OAuthClientModule {}
