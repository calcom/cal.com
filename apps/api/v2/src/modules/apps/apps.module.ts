import { AppsRepository } from "@/modules/apps/apps.repository";
import { GoogleCalendarOAuthController } from "@/modules/apps/controllers/gcal-oauth/gcal-oauth.controller";
import { CredentialsRepository } from "@/modules/credentials/credentials.repository";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { SelectedCalendarsRepository } from "@/modules/selected-calendars/selected-calendars.repository";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Module({
  imports: [PrismaModule, TokensModule],
  providers: [AppsRepository, ConfigService, CredentialsRepository, SelectedCalendarsRepository],
  controllers: [GoogleCalendarOAuthController],
  exports: [],
})
export class AppsModule {}
