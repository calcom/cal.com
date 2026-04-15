import { Module } from "@nestjs/common";
import { BookingAttendeesController_2024_08_13 } from "@/platform/bookings/2024-08-13/controllers/booking-attendees.controller";
import { BookingGuestsController_2024_08_13 } from "@/platform/bookings/2024-08-13/controllers/booking-guests.controller";
import { BookingLocationController_2024_08_13 } from "@/platform/bookings/2024-08-13/controllers/booking-location.controller";
import { BookingsController_2024_08_13 } from "@/platform/bookings/2024-08-13/controllers/bookings.controller";
import { BookingPbacGuard } from "@/platform/bookings/2024-08-13/guards/booking-pbac.guard";
import { BookingReferencesRepository_2024_08_13 } from "@/platform/bookings/2024-08-13/repositories/booking-references.repository";
import { BookingsRepository_2024_08_13 } from "@/platform/bookings/2024-08-13/repositories/bookings.repository";
import { BookingAttendeesService_2024_08_13 } from "@/platform/bookings/2024-08-13/services/booking-attendees.service";
import { BookingGuestsService_2024_08_13 } from "@/platform/bookings/2024-08-13/services/booking-guests.service";
import { BookingLocationService_2024_08_13 } from "@/platform/bookings/2024-08-13/services/booking-location.service";
import { BookingLocationCalendarSyncService_2024_08_13 } from "@/platform/bookings/2024-08-13/services/booking-location-calendar-sync.service";
import { BookingLocationCredentialService_2024_08_13 } from "@/platform/bookings/2024-08-13/services/booking-location-credential.service";
import { BookingLocationIntegrationService_2024_08_13 } from "@/platform/bookings/2024-08-13/services/booking-location-integration.service";
import { BookingReferencesService_2024_08_13 } from "@/platform/bookings/2024-08-13/services/booking-references.service";
import { BookingVideoService_2024_08_13 } from "@/platform/bookings/2024-08-13/services/booking-video.service";
import { BookingsService_2024_08_13 } from "@/platform/bookings/2024-08-13/services/bookings.service";
import { CalVideoOutputService } from "@/platform/bookings/2024-08-13/services/cal-video.output.service";
import { CalVideoService } from "@/platform/bookings/2024-08-13/services/cal-video.service";
import { ErrorsBookingsService_2024_08_13 } from "@/platform/bookings/2024-08-13/services/errors.service";
import { InputBookingsService_2024_08_13 } from "@/platform/bookings/2024-08-13/services/input.service";
import { OutputBookingsService_2024_08_13 } from "@/platform/bookings/2024-08-13/services/output.service";
import { OutputBookingReferencesService_2024_08_13 } from "@/platform/bookings/2024-08-13/services/output-booking-references.service";
import { PlatformBookingsService } from "@/platform/bookings/shared/platform-bookings.service";
import { CalendarsRepository } from "@/platform/calendars/calendars.repository";
import { CalendarsService } from "@/platform/calendars/services/calendars.service";
import { CalendarsCacheService } from "@/platform/calendars/services/calendars-cache.service";
import { EventTypesModule_2024_04_15 } from "@/platform/event-types/event-types_2024_04_15/event-types.module";
import { EventTypesModule_2024_06_14 } from "@/platform/event-types/event-types_2024_06_14/event-types.module";
import { EventTypesRepository_2024_06_14 } from "@/platform/event-types/event-types_2024_06_14/event-types.repository";
import { OutputEventTypesService_2024_06_14 } from "@/platform/event-types/event-types_2024_06_14/services/output-event-types.service";
import { SchedulesModule_2024_04_15 } from "@/platform/schedules/schedules_2024_04_15/schedules.module";
import { BookingAttendeesModule } from "@/lib/modules/booking-attendees.module";
import { RecurringBookingModule } from "@/lib/modules/recurring-booking.module";
import { RegularBookingModule } from "@/lib/modules/regular-booking.module";
import { ApiKeysRepository } from "@/modules/api-keys/api-keys-repository";
import { AppsRepository } from "@/modules/apps/apps.repository";
import { BookingSeatModule } from "@/modules/booking-seat/booking-seat.module";
import { BookingSeatRepository } from "@/modules/booking-seat/booking-seat.repository";
import { CredentialsRepository } from "@/modules/credentials/credentials.repository";
import { KyselyModule } from "@/modules/kysely/kysely.module";
import { MembershipsModule } from "@/modules/memberships/memberships.module";
import { OAuthClientRepository } from "@/modules/oauth-clients/oauth-client.repository";
import { OAuthClientUsersService } from "@/modules/oauth-clients/services/oauth-clients-users.service";
import { OAuthFlowService } from "@/modules/oauth-clients/services/oauth-flow.service";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { ProfilesModule } from "@/modules/profiles/profiles.module";
import { RedisModule } from "@/modules/redis/redis.module";
import { SelectedCalendarsRepository } from "@/modules/selected-calendars/selected-calendars.repository";
import { StripeModule } from "@/modules/stripe/stripe.module";
import { TeamsEventTypesRepository } from "@/modules/teams/event-types/teams-event-types.repository";
import { TeamsRepository } from "@/modules/teams/teams/teams.repository";
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
    BookingSeatModule,
    SchedulesModule_2024_04_15,
    EventTypesModule_2024_04_15,
    EventTypesModule_2024_06_14,
    StripeModule,
    MembershipsModule,
    ProfilesModule,
    RegularBookingModule,
    RecurringBookingModule,
    BookingAttendeesModule,
  ],
  providers: [
    TokensRepository,
    OAuthFlowService,
    OAuthClientRepository,
    OAuthClientUsersService,
    BookingsService_2024_08_13,
    BookingAttendeesService_2024_08_13,
    BookingGuestsService_2024_08_13,
    InputBookingsService_2024_08_13,
    OutputBookingsService_2024_08_13,
    OutputBookingReferencesService_2024_08_13,
    OutputEventTypesService_2024_06_14,
    BookingsRepository_2024_08_13,
    EventTypesRepository_2024_06_14,
    BookingSeatRepository,
    ApiKeysRepository,
    PlatformBookingsService,
    CalendarsService,
    CalendarsCacheService,
    CredentialsRepository,
    AppsRepository,
    CalendarsRepository,
    SelectedCalendarsRepository,
    TeamsEventTypesRepository,
    TeamsRepository,
    ErrorsBookingsService_2024_08_13,
    BookingReferencesService_2024_08_13,
    BookingReferencesRepository_2024_08_13,
    CalVideoService,
    CalVideoOutputService,
    BookingPbacGuard,
    BookingLocationCalendarSyncService_2024_08_13,
    BookingLocationCredentialService_2024_08_13,
    BookingLocationIntegrationService_2024_08_13,
    BookingLocationService_2024_08_13,
    BookingVideoService_2024_08_13,
  ],
  controllers: [
    BookingsController_2024_08_13,
    BookingAttendeesController_2024_08_13,
    BookingGuestsController_2024_08_13,
    BookingLocationController_2024_08_13,
  ],
  exports: [InputBookingsService_2024_08_13, OutputBookingsService_2024_08_13, BookingsService_2024_08_13],
})
export class BookingsModule_2024_08_13 {}
