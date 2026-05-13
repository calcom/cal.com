import { Module } from "@nestjs/common";
import { BookingsController_2024_04_15 } from "@/platform/bookings/2024-04-15/controllers/bookings.controller";
import { PlatformBookingsService } from "@/platform/bookings/shared/platform-bookings.service";
import { CalendarsRepository } from "@/platform/calendars/calendars.repository";
import { CalendarsService } from "@/platform/calendars/services/calendars.service";
import { CalendarsCacheService } from "@/platform/calendars/services/calendars-cache.service";
import { EventTypesModule_2024_04_15 } from "@/platform/event-types/event-types_2024_04_15/event-types.module";
import { EventTypesModule_2024_06_14 } from "@/platform/event-types/event-types_2024_06_14/event-types.module";
import { SchedulesModule_2024_04_15 } from "@/platform/schedules/schedules_2024_04_15/schedules.module";
import { BookingEventHandlerModule } from "@/lib/modules/booking-event-handler.module";
import { RecurringBookingModule } from "@/lib/modules/recurring-booking.module";
import { RegularBookingModule } from "@/lib/modules/regular-booking.module";
import { PrismaEventTypeRepository } from "@/lib/repositories/prisma-event-type.repository";
import { PrismaTeamRepository } from "@/lib/repositories/prisma-team.repository";
import { ApiKeysRepository } from "@/modules/api-keys/api-keys-repository";
import { AppsRepository } from "@/modules/apps/apps.repository";
import { CredentialsRepository } from "@/modules/credentials/credentials.repository";
import { KyselyModule } from "@/modules/kysely/kysely.module";
import { OAuthClientRepository } from "@/modules/oauth-clients/oauth-client.repository";
import { OAuthClientUsersService } from "@/modules/oauth-clients/services/oauth-clients-users.service";
import { OAuthFlowService } from "@/modules/oauth-clients/services/oauth-flow.service";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { ProfilesModule } from "@/modules/profiles/profiles.module";
import { RedisModule } from "@/modules/redis/redis.module";
import { SelectedCalendarsRepository } from "@/modules/selected-calendars/selected-calendars.repository";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { TokensRepository } from "@/modules/tokens/tokens.repository";
import { UsersModule } from "@/modules/users/users.module";

@Module({
  imports: [
    PrismaModule,
    KyselyModule,
    RedisModule,
    TokensModule,
    UsersModule,
    EventTypesModule_2024_04_15,
    SchedulesModule_2024_04_15,
    EventTypesModule_2024_06_14,
    ProfilesModule,
    RegularBookingModule,
    RecurringBookingModule,
    BookingEventHandlerModule,
  ],
  providers: [
    TokensRepository,
    OAuthFlowService,
    OAuthClientRepository,
    ApiKeysRepository,
    OAuthClientUsersService,
    PlatformBookingsService,
    CalendarsService,
    CalendarsCacheService,
    CredentialsRepository,
    AppsRepository,
    CalendarsRepository,
    SelectedCalendarsRepository,
    PrismaEventTypeRepository,
    PrismaTeamRepository,
  ],
  controllers: [BookingsController_2024_04_15],
})
export class BookingsModule_2024_04_15 {}
