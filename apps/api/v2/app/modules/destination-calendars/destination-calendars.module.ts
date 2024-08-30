import { Module } from "@nestjs/common";
import { CalendarsRepository } from "app/ee/calendars/calendars.repository";
import { CalendarsService } from "app/ee/calendars/services/calendars.service";
import { AppsRepository } from "app/modules/apps/apps.repository";
import { CredentialsRepository } from "app/modules/credentials/credentials.repository";
import { DestinationCalendarsController } from "app/modules/destination-calendars/controllers/destination-calendars.controller";
import { DestinationCalendarsRepository } from "app/modules/destination-calendars/destination-calendars.repository";
import { DestinationCalendarsService } from "app/modules/destination-calendars/services/destination-calendars.service";
import { PrismaModule } from "app/modules/prisma/prisma.module";
import { UsersRepository } from "app/modules/users/users.repository";

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
  ],
  controllers: [DestinationCalendarsController],
  exports: [DestinationCalendarsRepository],
})
export class DestinationCalendarsModule {}
