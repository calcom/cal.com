import { BullModule } from "@nestjs/bull";
import { Module } from "@nestjs/common";
import { CalendarsRepository } from "@/platform/calendars/calendars.repository";
import { CALENDARS_QUEUE } from "@/platform/calendars/processors/calendars.processor";
import { CalendarsService } from "@/platform/calendars/services/calendars.service";
import { CalendarsCacheService } from "@/platform/calendars/services/calendars-cache.service";
import { CalendarsTaskerModule } from "@/lib/modules/calendars-tasker.module";
import { AppsRepository } from "@/modules/apps/apps.repository";
import { CredentialsRepository } from "@/modules/credentials/credentials.repository";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { RedisModule } from "@/modules/redis/redis.module";
import { SelectedCalendarsController } from "@/modules/selected-calendars/controllers/selected-calendars.controller";
import { SelectedCalendarsRepository } from "@/modules/selected-calendars/selected-calendars.repository";
import { SelectedCalendarsService } from "@/modules/selected-calendars/services/selected-calendars.service";
import { UsersRepository } from "@/modules/users/users.repository";

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    BullModule.registerQueue({
      name: CALENDARS_QUEUE,
      limiter: {
        max: 1,
        duration: 1000,
      },
    }),
    CalendarsTaskerModule,
  ],
  providers: [
    SelectedCalendarsRepository,
    CalendarsRepository,
    CalendarsService,
    CalendarsCacheService,
    UsersRepository,
    CredentialsRepository,
    AppsRepository,
    SelectedCalendarsService,
  ],
  controllers: [SelectedCalendarsController],
  exports: [SelectedCalendarsRepository],
})
export class SelectedCalendarsModule {}
