import { CalendarsRepository } from "@/ee/calendars/calendars.repository";
import { CalendarsService } from "@/ee/calendars/services/calendars.service";
import { DestinationCalendarController } from "@/modules/destination-calendar/controllers/destination-calendar.controller";
import { DestinationCalendarRepository } from "@/modules/destination-calendar/destination-calendar.repository";
import { DestinationCalendarService } from "@/modules/destination-calendar/services/destination-calendar.service";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaModule],
  providers: [CalendarsRepository, CalendarsService, DestinationCalendarService],
  controllers: [DestinationCalendarController],
  exports: [DestinationCalendarRepository],
})
export class DestinationCalendarModule {}
