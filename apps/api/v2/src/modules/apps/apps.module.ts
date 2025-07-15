import { AppsRepository } from "@/modules/apps/appsRepository";
import { CredentialsRepository } from "@/modules/credentials/credentialsRepository";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { SelectedCalendarsRepository } from "@/modules/selected-calendars/selectedCalendarsRepository";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Module({
  imports: [PrismaModule, TokensModule],
  providers: [AppsRepository, ConfigService, CredentialsRepository, SelectedCalendarsRepository],
  exports: [],
})
export class AppsModule {}
