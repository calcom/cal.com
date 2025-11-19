import { BookingReferencesRepository_2024_08_13 } from "@/ee/bookings/2024-08-13/repositories/booking-references.repository";
import { BookingsRepository_2024_08_13 } from "@/ee/bookings/2024-08-13/repositories/bookings.repository";
import { CalendarsRepository } from "@/ee/calendars/calendars.repository";
import { CalendarsController } from "@/ee/calendars/controllers/calendars.controller";
import { AppleCalendarService } from "@/ee/calendars/services/apple-calendar.service";
import { CalendarsCacheService } from "@/ee/calendars/services/calendars-cache.service";
import { CalendarsService } from "@/ee/calendars/services/calendars.service";
import { GoogleCalendarService } from "@/ee/calendars/services/gcal.service";
import { IcsFeedService } from "@/ee/calendars/services/ics-feed.service";
import { OutlookService } from "@/ee/calendars/services/outlook.service";
import { AppsRepository } from "@/modules/apps/apps.repository";
import { CredentialsRepository } from "@/modules/credentials/credentials.repository";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { RedisModule } from "@/modules/redis/redis.module";
import { SelectedCalendarsRepository } from "@/modules/selected-calendars/selected-calendars.repository";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { UsersModule } from "@/modules/users/users.module";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaModule, UsersModule, TokensModule, RedisModule],
  providers: [
    CredentialsRepository,
    CalendarsService,
    CalendarsCacheService,
    OutlookService,
    GoogleCalendarService,
    AppleCalendarService,
    IcsFeedService,
    SelectedCalendarsRepository,
    AppsRepository,
    CalendarsRepository,
    BookingsRepository_2024_08_13,
    BookingReferencesRepository_2024_08_13,
  ],
  controllers: [CalendarsController],
  exports: [CalendarsService, GoogleCalendarService],
})
export class CalendarsModule {}
