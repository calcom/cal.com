import { CalendarsRepository } from "@/ee/calendars/calendars.repository";
import { CalendarsService } from "@/ee/calendars/services/calendars.service";
import { DestinationCalendarsController } from "@/modules/destination-calendars/controllers/destination-calendars.controller";
import { DestinationCalendarsRepository } from "@/modules/destination-calendars/destination-calendars.repository";
import { DestinationCalendarsService } from "@/modules/destination-calendars/services/destination-calendars.service";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaModule],
  providers: [CalendarsRepository, CalendarsService, DestinationCalendarsService],
  controllers: [DestinationCalendarsController],
  exports: [DestinationCalendarsRepository],
})
export class DestinationCalendarsModule {}
