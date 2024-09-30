import { Module } from "@nestjs/common";

import { AppsRepository } from "../../modules/apps/apps.repository";
import { CredentialsRepository } from "../../modules/credentials/credentials.repository";
import { SelectedCalendarsRepository } from "../../modules/selected-calendars/selected-calendars.repository";
import { TokensModule } from "../../modules/tokens/tokens.module";
import { UsersModule } from "../../modules/users/users.module";
import { CalendarsRepository } from "../calendars/calendars.repository";
import { CalendarsController } from "../calendars/controllers/calendars.controller";
import { AppleCalendarService } from "../calendars/services/apple-calendar.service";
import { CalendarsService } from "../calendars/services/calendars.service";
import { GoogleCalendarService } from "../calendars/services/gcal.service";
import { OutlookService } from "../calendars/services/outlook.service";

@Module({
  imports: [UsersModule, TokensModule],
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
