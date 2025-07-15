import { CalendarsRepository } from "@/ee/calendars/calendarsRepository";
import { CalendarsService } from "@/ee/calendars/services/calendarsService";
import { AppsRepository } from "@/modules/apps/appsRepository";
import { CredentialsRepository } from "@/modules/credentials/credentialsRepository";
import { DestinationCalendarsController } from "@/modules/destination-calendars/controllers/destination-calendars.controller";
import { DestinationCalendarsRepository } from "@/modules/destination-calendars/destinationCalendarsRepository";
import { DestinationCalendarsService } from "@/modules/destination-calendars/services/destinationCalendarsService";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { SelectedCalendarsRepository } from "@/modules/selected-calendars/selectedCalendarsRepository";
import { UsersRepository } from "@/modules/users/usersRepository";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaModule],
  providers: [
    CalendarsRepository,
    CalendarsService,
    DestinationCalendarsService,
    DestinationCalendarsRepository,
    UsersRepository,
    CredentialsRepository,
    AppsRepository,
    SelectedCalendarsRepository,
  ],
  controllers: [DestinationCalendarsController],
  exports: [DestinationCalendarsRepository],
})
export class DestinationCalendarsModule {}
