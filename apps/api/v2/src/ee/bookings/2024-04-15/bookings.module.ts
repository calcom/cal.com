import { BookingsController_2024_04_15 } from "@/ee/bookings/2024-04-15/controllers/bookings.controller";
import { PlatformBookingsService } from "@/ee/bookings/shared/platform-bookings.service";
import { CalendarsRepository } from "@/ee/calendars/calendars.repository";
import { CalendarsService } from "@/ee/calendars/services/calendars.service";
import { EventTypesModule_2024_04_15 } from "@/ee/event-types/event-types_2024_04_15/event-types.module";
import { EventTypesModule_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/event-types.module";
import { SchedulesModule_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/schedules.module";
import { ApiKeysRepository } from "@/modules/api-keys/api-keys-repository";
import { AppsRepository } from "@/modules/apps/apps.repository";
import { BillingModule } from "@/modules/billing/billing.module";
import { CredentialsRepository } from "@/modules/credentials/credentials.repository";
import { KyselyModule } from "@/modules/kysely/kysely.module";
import { OAuthClientRepository } from "@/modules/oauth-clients/oauth-client.repository";
import { OAuthClientUsersService } from "@/modules/oauth-clients/services/oauth-clients-users.service";
import { OAuthFlowService } from "@/modules/oauth-clients/services/oauth-flow.service";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { RedisModule } from "@/modules/redis/redis.module";
import { SelectedCalendarsRepository } from "@/modules/selected-calendars/selected-calendars.repository";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { TokensRepository } from "@/modules/tokens/tokens.repository";
import { UsersModule } from "@/modules/users/users.module";
import { Module } from "@nestjs/common";

@Module({
  imports: [
    PrismaModule,
    KyselyModule,
    RedisModule,
    TokensModule,
    BillingModule,
    UsersModule,
    EventTypesModule_2024_04_15,
    SchedulesModule_2024_04_15,
    EventTypesModule_2024_06_14,
  ],
  providers: [
    TokensRepository,
    OAuthFlowService,
    OAuthClientRepository,
    ApiKeysRepository,
    OAuthClientUsersService,
    PlatformBookingsService,
    CalendarsService,
    CredentialsRepository,
    AppsRepository,
    CalendarsRepository,
    SelectedCalendarsRepository,
  ],
  controllers: [BookingsController_2024_04_15],
})
export class BookingsModule_2024_04_15 {}
