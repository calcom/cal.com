import { CalendarsController } from "@/ee/calendars/controllers/calendars.controller";
import { CalendarsService } from "@/ee/calendars/services/calendars.service";
import { AppsRepository } from "@/modules/apps/apps.repository";
import { CredentialsRepository } from "@/modules/credentials/credentials.repository";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { SelectedCalendarsRepository } from "@/modules/selected-calendars/selected-calendars.repository";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { UsersModule } from "@/modules/users/users.module";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaModule, UsersModule, TokensModule],
  providers: [CredentialsRepository, CalendarsService, SelectedCalendarsRepository, AppsRepository],
  controllers: [CalendarsController],
  exports: [CalendarsService],
})
export class CalendarsModule {}
