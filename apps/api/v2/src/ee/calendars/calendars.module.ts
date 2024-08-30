import { Module } from "@nestjs/common";
import { CalendarsRepository } from "src/ee/calendars/calendars.repository";
import { CalendarsController } from "src/ee/calendars/controllers/calendars.controller";
import { AppleCalendarService } from "src/ee/calendars/services/apple-calendar.service";
import { CalendarsService } from "src/ee/calendars/services/calendars.service";
import { GoogleCalendarService } from "src/ee/calendars/services/gcal.service";
import { OutlookService } from "src/ee/calendars/services/outlook.service";
import { AppsRepository } from "src/modules/apps/apps.repository";
import { CredentialsRepository } from "src/modules/credentials/credentials.repository";
import { PrismaModule } from "src/modules/prisma/prisma.module";
import { SelectedCalendarsRepository } from "src/modules/selected-calendars/selected-calendars.repository";
import { TokensModule } from "src/modules/tokens/tokens.module";
import { UsersModule } from "src/modules/users/users.module";

@Module({
  imports: [PrismaModule, UsersModule, TokensModule],
  providers: [
    CredentialsRepository,
    CalendarsService,
    OutlookService,
    GoogleCalendarService,
    AppleCalendarService,
    SelectedCalendarsRepository,
    AppsRepository,
    CalendarsRepository,
  ],
  controllers: [CalendarsController],
  exports: [CalendarsService],
})
export class CalendarsModule {}
