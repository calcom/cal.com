import { BookingReferencesRepository_2024_08_13 } from "@/ee/bookings/2024-08-13/booking-references.repository";
import { CalendarsRepository } from "@/ee/calendars/calendars.repository";
import { CalendarsService } from "@/ee/calendars/services/calendars.service";
import { GoogleCalendarService as GCalService } from "@/ee/calendars/services/gcal.service";
import { AppsRepository } from "@/modules/apps/apps.repository";
import { CalUnifiedCalendarsController } from "@/modules/cal-unified-calendars/controllers/cal-unified-calendars.controller";
import { GoogleCalendarService } from "@/modules/cal-unified-calendars/services/google-calendar.service";
import { CredentialsRepository } from "@/modules/credentials/credentials.repository";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { SelectedCalendarsRepository } from "@/modules/selected-calendars/selected-calendars.repository";
import { TokensRepository } from "@/modules/tokens/tokens.repository";
import { UsersRepository } from "@/modules/users/users.repository";
import { Module } from "@nestjs/common";

@Module({
  imports: [],
  providers: [
    GCalService,
    GoogleCalendarService,
    AppsRepository,
    BookingReferencesRepository_2024_08_13,
    CredentialsRepository,
    CalendarsService,
    TokensRepository,
    SelectedCalendarsRepository,
    PrismaReadService,
    PrismaWriteService,
    UsersRepository,
    CalendarsRepository,
  ],
  controllers: [CalUnifiedCalendarsController],
  exports: [GoogleCalendarService],
})
export class CalUnifiedCalendarsModule {}
