import { Module } from "@nestjs/common";
import { CalendarsRepository } from "src/ee/calendars/calendars.repository";
import { CalendarsService } from "src/ee/calendars/services/calendars.service";
import { AppsRepository } from "src/modules/apps/apps.repository";
import { CredentialsRepository } from "src/modules/credentials/credentials.repository";
import { PrismaModule } from "src/modules/prisma/prisma.module";
import { SelectedCalendarsController } from "src/modules/selected-calendars/controllers/selected-calendars.controller";
import { SelectedCalendarsRepository } from "src/modules/selected-calendars/selected-calendars.repository";
import { UsersRepository } from "src/modules/users/users.repository";

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
