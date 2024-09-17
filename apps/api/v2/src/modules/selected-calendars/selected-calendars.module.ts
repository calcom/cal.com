import { Module } from "@nestjs/common";

import { CalendarsRepository } from "../../ee/calendars/calendars.repository";
import { CalendarsService } from "../../ee/calendars/services/calendars.service";
import { AppsRepository } from "../apps/apps.repository";
import { CredentialsRepository } from "../credentials/credentials.repository";
import { PrismaModule } from "../prisma/prisma.module";
import { SelectedCalendarsController } from "../selected-calendars/controllers/selected-calendars.controller";
import { SelectedCalendarsRepository } from "../selected-calendars/selected-calendars.repository";
import { UsersRepository } from "../users/users.repository";

@Module({
  imports: [PrismaModule],
  providers: [
    SelectedCalendarsRepository,
    CalendarsRepository,
    CalendarsService,
    UsersRepository,
    CredentialsRepository,
    AppsRepository,
  ],
  controllers: [SelectedCalendarsController],
  exports: [SelectedCalendarsRepository],
})
export class SelectedCalendarsModule {}
