import { Module } from "@nestjs/common";
import { CalendarsRepository } from "src/ee/calendars/calendars.repository";
import { CalendarsService } from "src/ee/calendars/services/calendars.service";
import { AppsRepository } from "src/modules/apps/apps.repository";
import { CredentialsRepository } from "src/modules/credentials/credentials.repository";
import { DestinationCalendarsController } from "src/modules/destination-calendars/controllers/destination-calendars.controller";
import { DestinationCalendarsRepository } from "src/modules/destination-calendars/destination-calendars.repository";
import { DestinationCalendarsService } from "src/modules/destination-calendars/services/destination-calendars.service";
import { PrismaModule } from "src/modules/prisma/prisma.module";
import { UsersRepository } from "src/modules/users/users.repository";

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
