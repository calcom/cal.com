import { BookingReferencesRepository_2024_08_13 } from "@/ee/bookings/2024-08-13/bookingReferencesRepository";
import { CalendarsRepository } from "@/ee/calendars/calendarsRepository";
import { CalendarsService } from "@/ee/calendars/services/calendarsService";
import { GoogleCalendarService as GCalService } from "@/ee/calendars/services/gcalService";
import { AppsRepository } from "@/modules/apps/appsRepository";
import { CalUnifiedCalendarsController } from "@/modules/cal-unified-calendars/controllers/cal-unified-calendars.controller";
import { GoogleCalendarService } from "@/modules/cal-unified-calendars/services/googleCalendarService";
import { CredentialsRepository } from "@/modules/credentials/credentialsRepository";
import { PrismaReadService } from "@/modules/prisma/prismaReadService";
import { PrismaWriteService } from "@/modules/prisma/prismaWriteService";
import { SelectedCalendarsRepository } from "@/modules/selected-calendars/selectedCalendarsRepository";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { UsersRepository } from "@/modules/users/usersRepository";
import { Module } from "@nestjs/common";

@Module({
  imports: [TokensModule],
  providers: [
    GCalService,
    GoogleCalendarService,
    AppsRepository,
    BookingReferencesRepository_2024_08_13,
    CredentialsRepository,
    CalendarsService,
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
