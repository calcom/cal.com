import { CalendarsController } from "@/ee/calendars/controllers/calendars.controller";
import { CalendarsService } from "@/ee/calendars/services/calendars.service";
import { OverlayCalendarsService } from "@/ee/calendars/services/overlay-calendars.service";
import { CredentialsRepository } from "@/modules/credentials/credentials.repository";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { UsersModule } from "@/modules/users/users.module";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaModule, UsersModule],
  providers: [CredentialsRepository, CalendarsService, OverlayCalendarsService],
  controllers: [CalendarsController],
  exports: [OverlayCalendarsService],
})
export class CalendarsModule {}
