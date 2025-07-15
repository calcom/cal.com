import { BookingReferencesRepository_2024_08_13 } from "@/ee/bookings/2024-08-13/bookingReferencesRepository";
import { BookingsRepository_2024_08_13 } from "@/ee/bookings/2024-08-13/bookingsRepository";
import { CalendarsRepository } from "@/ee/calendars/calendarsRepository";
import { CalendarsController } from "@/ee/calendars/controllers/calendars.controller";
import { AppleCalendarService } from "@/ee/calendars/services/appleCalendarService";
import { CalendarsService } from "@/ee/calendars/services/calendarsService";
import { GoogleCalendarService } from "@/ee/calendars/services/gcalService";
import { IcsFeedService } from "@/ee/calendars/services/icsFeedService";
import { OutlookService } from "@/ee/calendars/services/outlookService";
import { AppsRepository } from "@/modules/apps/appsRepository";
import { CredentialsRepository } from "@/modules/credentials/credentialsRepository";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { SelectedCalendarsRepository } from "@/modules/selected-calendars/selectedCalendarsRepository";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { UsersModule } from "@/modules/users/users.module";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaModule, UsersModule, TokensModule],
  providers: [
    CredentialsRepository,
    CalendarsService,
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
