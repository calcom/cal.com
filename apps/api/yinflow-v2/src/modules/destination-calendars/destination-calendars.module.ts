import { Module } from "@nestjs/common";

import { CalendarsRepository } from "../../ee/calendars/calendars.repository";
import { CalendarsService } from "../../ee/calendars/services/calendars.service";
import { AppsRepository } from "../apps/apps.repository";
import { CredentialsRepository } from "../credentials/credentials.repository";
import { DestinationCalendarsController } from "../destination-calendars/controllers/destination-calendars.controller";
import { DestinationCalendarsRepository } from "../destination-calendars/destination-calendars.repository";
import { DestinationCalendarsService } from "../destination-calendars/services/destination-calendars.service";
import { PrismaModule } from "../prisma/prisma.module";
import { SelectedCalendarsRepository } from "../selected-calendars/selected-calendars.repository";
import { UsersRepository } from "../users/users.repository";

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
