import { CalendarsController } from "@/ee/calendars/controllers/calendars.controller";
import { CalendarsService } from "@/ee/calendars/services/calendars.service";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { UsersModule } from "@/modules/users/users.module";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaModule, UsersModule],
  providers: [CalendarsService],
  controllers: [CalendarsController],
})
export class CalendarsModule {}
