import { CalendarsRepository } from "@/ee/calendars/calendars.repository";
import { CalendarsCacheService } from "@/ee/calendars/services/calendars-cache.service";
import { CalendarsService } from "@/ee/calendars/services/calendars.service";
import { EventTypesModule_2024_04_15 } from "@/ee/event-types/event-types_2024_04_15/event-types.module";
import { SchedulesModule_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/schedules.module";
import { AppsRepository } from "@/modules/apps/apps.repository";
import { AuthModule } from "@/modules/auth/auth.module";
import { BillingModule } from "@/modules/billing/billing.module";
import { CredentialsRepository } from "@/modules/credentials/credentials.repository";
import { MembershipsModule } from "@/modules/memberships/memberships.module";
import { OAuthClientUsersController } from "@/modules/oauth-clients/controllers/oauth-client-users/oauth-client-users.controller";
import { OAuthClientsController } from "@/modules/oauth-clients/controllers/oauth-clients/oauth-clients.controller";
import { OAuthFlowController } from "@/modules/oauth-clients/controllers/oauth-flow/oauth-flow.controller";
import { OAuthClientRepository } from "@/modules/oauth-clients/oauth-client.repository";
import { OAuthClientUsersOutputService } from "@/modules/oauth-clients/services/oauth-clients-users-output.service";
import { OAuthClientUsersService } from "@/modules/oauth-clients/services/oauth-clients-users.service";
import { OAuthClientsInputService } from "@/modules/oauth-clients/services/oauth-clients/oauth-clients-input.service";
import { OAuthClientsOutputService } from "@/modules/oauth-clients/services/oauth-clients/oauth-clients-output.service";
import { OAuthClientsService } from "@/modules/oauth-clients/services/oauth-clients/oauth-clients.service";
import { OAuthFlowService } from "@/modules/oauth-clients/services/oauth-flow.service";
import { OrganizationsModule } from "@/modules/organizations/organizations.module";
import { OrganizationsTeamsService } from "@/modules/organizations/teams/index/services/organizations-teams.service";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { ProfilesModule } from "@/modules/profiles/profiles.module";
import { RedisModule } from "@/modules/redis/redis.module";
import { SelectedCalendarsRepository } from "@/modules/selected-calendars/selected-calendars.repository";
import { StripeModule } from "@/modules/stripe/stripe.module";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { TokensRepository } from "@/modules/tokens/tokens.repository";
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
    ProfilesModule,
  ],
  providers: [
    OAuthClientRepository,
    TokensRepository,
    OAuthFlowService,
    CalendarsService,
    CalendarsCacheService,
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
