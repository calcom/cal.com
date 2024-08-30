import { Module } from "@nestjs/common";
import { CalendarsRepository } from "app/ee/calendars/calendars.repository";
import { CalendarsController } from "app/ee/calendars/controllers/calendars.controller";
import { AppleCalendarService } from "app/ee/calendars/services/apple-calendar.service";
import { CalendarsService } from "app/ee/calendars/services/calendars.service";
import { GoogleCalendarService } from "app/ee/calendars/services/gcal.service";
import { OutlookService } from "app/ee/calendars/services/outlook.service";
import { AppsRepository } from "app/modules/apps/apps.repository";
import { CredentialsRepository } from "app/modules/credentials/credentials.repository";
import { PrismaModule } from "app/modules/prisma/prisma.module";
import { SelectedCalendarsRepository } from "app/modules/selected-calendars/selected-calendars.repository";
import { TokensModule } from "app/modules/tokens/tokens.module";
import { UsersModule } from "app/modules/users/users.module";

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
