import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AppsRepository } from "src/modules/apps/apps.repository";
import { CredentialsRepository } from "src/modules/credentials/credentials.repository";
import { PrismaModule } from "src/modules/prisma/prisma.module";
import { SelectedCalendarsRepository } from "src/modules/selected-calendars/selected-calendars.repository";
import { TokensModule } from "src/modules/tokens/tokens.module";

@Module({
  imports: [PrismaModule, TokensModule],
  providers: [AppsRepository, ConfigService, CredentialsRepository, SelectedCalendarsRepository],
  exports: [],
})
export class AppsModule {}
