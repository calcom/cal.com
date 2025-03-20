import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { AppsRepository } from "../apps/apps.repository";
import { CredentialsRepository } from "../credentials/credentials.repository";
import { PrismaModule } from "../prisma/prisma.module";
import { SelectedCalendarsRepository } from "../selected-calendars/selected-calendars.repository";
import { TokensModule } from "../tokens/tokens.module";

@Module({
  imports: [PrismaModule, TokensModule],
  providers: [AppsRepository, ConfigService, CredentialsRepository, SelectedCalendarsRepository],
  exports: [],
})
export class AppsModule {}
