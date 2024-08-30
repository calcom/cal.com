import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AppsRepository } from "app/modules/apps/apps.repository";
import { CredentialsRepository } from "app/modules/credentials/credentials.repository";
import { PrismaModule } from "app/modules/prisma/prisma.module";
import { SelectedCalendarsRepository } from "app/modules/selected-calendars/selected-calendars.repository";
import { TokensModule } from "app/modules/tokens/tokens.module";

@Module({
  imports: [PrismaModule, TokensModule],
  providers: [AppsRepository, ConfigService, CredentialsRepository, SelectedCalendarsRepository],
  exports: [],
})
export class AppsModule {}
