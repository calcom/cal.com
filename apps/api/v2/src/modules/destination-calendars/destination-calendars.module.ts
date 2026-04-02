import { Module } from "@nestjs/common";
import { CalendarsRepository } from "@/ee/calendars/calendars.repository";
import { CalendarsService } from "@/ee/calendars/services/calendars.service";
import { CalendarsCacheService } from "@/ee/calendars/services/calendars-cache.service";
import { AppsRepository } from "@/modules/apps/apps.repository";
import { CredentialsRepository } from "@/modules/credentials/credentials.repository";
import { DestinationCalendarsController } from "@/modules/destination-calendars/controllers/destination-calendars.controller";
import { DestinationCalendarsRepository } from "@/modules/destination-calendars/destination-calendars.repository";
import { DestinationCalendarsService } from "@/modules/destination-calendars/services/destination-calendars.service";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { RedisModule } from "@/modules/redis/redis.module";
import { SelectedCalendarsRepository } from "@/modules/selected-calendars/selected-calendars.repository";
import { UsersRepository } from "@/modules/users/users.repository";

@Module({
  imports: [PrismaModule, RedisModule],
  providers: [
    CalendarsRepository,
    CalendarsService,
    CalendarsCacheService,
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
