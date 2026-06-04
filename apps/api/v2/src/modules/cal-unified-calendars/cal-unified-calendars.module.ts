import { Module } from "@nestjs/common";
import { BookingReferencesRepository_2024_08_13 } from "@/platform/bookings/2024-08-13/repositories/booking-references.repository";
import { CalendarsRepository } from "@/platform/calendars/calendars.repository";
import { CalendarsService } from "@/platform/calendars/services/calendars.service";
import { CalendarsCacheService } from "@/platform/calendars/services/calendars-cache.service";
import { GoogleCalendarService as GCalService } from "@/platform/calendars/services/gcal.service";
import { AppsRepository } from "@/modules/apps/apps.repository";
import { CalUnifiedCalendarsController } from "@/modules/cal-unified-calendars/controllers/cal-unified-calendars.controller";
import { GoogleCalendarService } from "@/modules/cal-unified-calendars/services/google-calendar.service";
import { UnifiedCalendarService } from "@/modules/cal-unified-calendars/services/unified-calendar.service";
import { UnifiedCalendarsFreebusyService } from "@/modules/cal-unified-calendars/services/unified-calendars-freebusy.service";
import { CredentialsRepository } from "@/modules/credentials/credentials.repository";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { RedisModule } from "@/modules/redis/redis.module";
import { SelectedCalendarsRepository } from "@/modules/selected-calendars/selected-calendars.repository";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { UsersRepository } from "@/modules/users/users.repository";

@Module({
  imports: [TokensModule, RedisModule],
  providers: [
    GCalService,
    GoogleCalendarService,
    UnifiedCalendarService,
    UnifiedCalendarsFreebusyService,
    AppsRepository,
    BookingReferencesRepository_2024_08_13,
    CredentialsRepository,
    CalendarsService,
    CalendarsCacheService,
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
