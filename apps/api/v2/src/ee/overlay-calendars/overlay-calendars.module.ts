import { OverlayCalendarController } from "@/ee/overlay-calendars/controllers/overlay-calendars.controller";
import { OverlayCalendarsService } from "@/ee/overlay-calendars/services/overlay-calendars.service";
import { CredentialsRepository } from "@/modules/credentials/credentials.repository";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaModule],
  providers: [CredentialsRepository, OverlayCalendarsService],
  controllers: [OverlayCalendarController],
  exports: [OverlayCalendarsService],
})
export class OverlayCalendarsModule {}
