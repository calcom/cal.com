import { CalendarsRepository } from "@/ee/calendars/calendars.repository";
import { CalendarsService } from "@/ee/calendars/services/calendars.service";
import { DestinationCalendarController } from "@/modules/destination-calendars/controllers/destination-calendars.controller";
import { DestinationCalendarRepository } from "@/modules/destination-calendars/destination-calendars.repository";
import { DestinationCalendarService } from "@/modules/destination-calendars/services/destination-calendars.service";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaModule],
  providers: [CalendarsRepository, CalendarsService, DestinationCalendarService],
  controllers: [DestinationCalendarController],
  exports: [DestinationCalendarRepository],
})
export class DestinationCalendarModule {}
