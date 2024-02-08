import { CalendarController } from "@/ee/calendars/controllers/calendars.controller";
import { CalendarsService } from "@/ee/calendars/services/calendars";
import { CredentialsRepository } from "@/modules/credentials/credentials.repository";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaModule],
  providers: [CredentialsRepository, CalendarsService],
  controllers: [CalendarController],
  exports: [CalendarsService],
})
export class CalendarsModule {}
