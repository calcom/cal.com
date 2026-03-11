import { Module } from "@nestjs/common";
import { BookingsModule_2024_08_13 } from "@/ee/bookings/2024-08-13/bookings.module";
import { BookingPbacGuard } from "@/ee/bookings/2024-08-13/guards/booking-pbac.guard";
import { BookingReferencesRepository_2024_08_13 } from "@/ee/bookings/2024-08-13/repositories/booking-references.repository";
import { BookingsRepository_2024_08_13 } from "@/ee/bookings/2024-08-13/repositories/bookings.repository";
import { BookingReferencesService_2024_08_13 } from "@/ee/bookings/2024-08-13/services/booking-references.service";
import { ErrorsBookingsService_2024_08_13 } from "@/ee/bookings/2024-08-13/services/errors.service";
import { InputBookingsService_2024_08_13 } from "@/ee/bookings/2024-08-13/services/input.service";
import { OutputBookingReferencesService_2024_08_13 } from "@/ee/bookings/2024-08-13/services/output-booking-references.service";
import { BookingsController_2026_02_25 } from "@/ee/bookings/2026-02-25/controllers/bookings.controller";
import { BookingsService_2026_02_25 } from "@/ee/bookings/2026-02-25/services/bookings.service";
import { OutputBookingsService_2026_02_25 } from "@/ee/bookings/2026-02-25/services/output.service";
import { PlatformBookingsService } from "@/ee/bookings/shared/platform-bookings.service";
import { CalendarsRepository } from "@/ee/calendars/calendars.repository";
import { CalendarsService } from "@/ee/calendars/services/calendars.service";
import { CalendarsCacheService } from "@/ee/calendars/services/calendars-cache.service";
import { EventTypesModule_2024_04_15 } from "@/ee/event-types/event-types_2024_04_15/event-types.module";
import { EventTypesModule_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/event-types.module";
import { EventTypesRepository_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/event-types.repository";
import { OutputEventTypesService_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/services/output-event-types.service";
import { SchedulesModule_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/schedules.module";
import { BookingEventHandlerModule } from "@/lib/modules/booking-event-handler.module";
import { InstantBookingModule } from "@/lib/modules/instant-booking.module";
import { RecurringBookingModule } from "@/lib/modules/recurring-booking.module";
import { RegularBookingModule } from "@/lib/modules/regular-booking.module";
import { PrismaFeaturesRepository } from "@/lib/repositories/prisma-features.repository";
import { ApiKeysRepository } from "@/modules/api-keys/api-keys-repository";
import { AppsRepository } from "@/modules/apps/apps.repository";
import { BillingModule } from "@/modules/billing/billing.module";
import { BookingSeatModule } from "@/modules/booking-seat/booking-seat.module";
import { BookingSeatRepository } from "@/modules/booking-seat/booking-seat.repository";
import { CredentialsRepository } from "@/modules/credentials/credentials.repository";
import { KyselyModule } from "@/modules/kysely/kysely.module";
import { MembershipsModule } from "@/modules/memberships/memberships.module";
import { OAuthClientRepository } from "@/modules/oauth-clients/oauth-client.repository";
import { OAuthClientUsersService } from "@/modules/oauth-clients/services/oauth-clients-users.service";
import { OAuthFlowService } from "@/modules/oauth-clients/services/oauth-flow.service";
import { OrganizationsRepository } from "@/modules/organizations/index/organizations.repository";
import { OrganizationsTeamsRepository } from "@/modules/organizations/teams/index/organizations-teams.repository";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { ProfilesModule } from "@/modules/profiles/profiles.module";
import { RedisModule } from "@/modules/redis/redis.module";
import { SelectedCalendarsRepository } from "@/modules/selected-calendars/selected-calendars.repository";
import { StripeModule } from "@/modules/stripe/stripe.module";
import { TeamsEventTypesModule } from "@/modules/teams/event-types/teams-event-types.module";
import { TeamsModule } from "@/modules/teams/teams/teams.module";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { TokensRepository } from "@/modules/tokens/tokens.repository";
import { UsersModule } from "@/modules/users/users.module";

@Module({
  imports: [
    PrismaModule,
    KyselyModule,
    RedisModule,
    TokensModule,
    BillingModule,
    UsersModule,
    BookingSeatModule,
    SchedulesModule_2024_04_15,
    EventTypesModule_2024_04_15,
    EventTypesModule_2024_06_14,
    StripeModule,
    TeamsModule,
    TeamsEventTypesModule,
    MembershipsModule,
    ProfilesModule,
    RegularBookingModule,
    RecurringBookingModule,
    InstantBookingModule,
    BookingEventHandlerModule,
    BookingsModule_2024_08_13,
  ],
  providers: [
    TokensRepository,
    OAuthFlowService,
    OAuthClientRepository,
    OAuthClientUsersService,
    BookingsService_2026_02_25,
    InputBookingsService_2024_08_13,
    OutputBookingsService_2026_02_25,
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
    OrganizationsTeamsRepository,
    OrganizationsRepository,
    ErrorsBookingsService_2024_08_13,
    BookingReferencesService_2024_08_13,
    BookingReferencesRepository_2024_08_13,
    BookingPbacGuard,
    PrismaFeaturesRepository,
  ],
  controllers: [BookingsController_2026_02_25],
  exports: [BookingsService_2026_02_25, OutputBookingsService_2026_02_25],
})
export class BookingsModule_2026_02_25 {}
