import { Module } from "@nestjs/common";
import { CalendarsRepository } from "app/ee/calendars/calendars.repository";
import { CalendarsService } from "app/ee/calendars/services/calendars.service";
import { AppsRepository } from "app/modules/apps/apps.repository";
import { CredentialsRepository } from "app/modules/credentials/credentials.repository";
import { PrismaModule } from "app/modules/prisma/prisma.module";
import { SelectedCalendarsController } from "app/modules/selected-calendars/controllers/selected-calendars.controller";
import { SelectedCalendarsRepository } from "app/modules/selected-calendars/selected-calendars.repository";
import { UsersRepository } from "app/modules/users/users.repository";

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
