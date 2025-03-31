import { BookingsRepository_2024_08_13 } from "@/ee/bookings/2024-08-13/bookings.repository";
import { BookingsController_2024_08_13 } from "@/ee/bookings/2024-08-13/controllers/bookings.controller";
import { BookingsService_2024_08_13 } from "@/ee/bookings/2024-08-13/services/bookings.service";
import { InputBookingsService_2024_08_13 } from "@/ee/bookings/2024-08-13/services/input.service";
import { OutputBookingsService_2024_08_13 } from "@/ee/bookings/2024-08-13/services/output.service";
import { PlatformBookingsService } from "@/ee/bookings/shared/platform-bookings.service";
import { CalendarsRepository } from "@/ee/calendars/calendars.repository";
import { CalendarsService } from "@/ee/calendars/services/calendars.service";
import { EventTypesModule_2024_04_15 } from "@/ee/event-types/event-types_2024_04_15/event-types.module";
import { EventTypesModule_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/event-types.module";
import { EventTypesRepository_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/event-types.repository";
import { SchedulesModule_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/schedules.module";
import { ApiKeysRepository } from "@/modules/api-keys/api-keys-repository";
import { AppsRepository } from "@/modules/apps/apps.repository";
import { BillingModule } from "@/modules/billing/billing.module";
import { BookingSeatModule } from "@/modules/booking-seat/booking-seat.module";
import { BookingSeatRepository } from "@/modules/booking-seat/booking-seat.repository";
import { CredentialsRepository } from "@/modules/credentials/credentials.repository";
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
    RedisModule,
    TokensModule,
    BillingModule,
    UsersModule,
    BookingSeatModule,
    SchedulesModule_2024_04_15,
    EventTypesModule_2024_04_15,
    EventTypesModule_2024_06_14,
  ],
  providers: [
    TokensRepository,
    OAuthFlowService,
    OAuthClientRepository,
    OAuthClientUsersService,
    BookingsService_2024_08_13,
    InputBookingsService_2024_08_13,
    OutputBookingsService_2024_08_13,
    BookingsRepository_2024_08_13,
    EventTypesRepository_2024_06_14,
    BookingSeatRepository,
    ApiKeysRepository,
    PlatformBookingsService,
    CalendarsService,
    CredentialsRepository,
    AppsRepository,
    CalendarsRepository,
    SelectedCalendarsRepository,
  ],
  controllers: [BookingsController_2024_08_13],
  exports: [InputBookingsService_2024_08_13, OutputBookingsService_2024_08_13, BookingsService_2024_08_13],
})
export class BookingsModule_2024_08_13 {}
