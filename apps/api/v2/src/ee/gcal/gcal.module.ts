import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CalendarsRepository } from "src/ee/calendars/calendars.repository";
import { CalendarsService } from "src/ee/calendars/services/calendars.service";
import { GcalController } from "src/ee/gcal/gcal.controller";
import { AppsRepository } from "src/modules/apps/apps.repository";
import { GCalService } from "src/modules/apps/services/gcal.service";
import { CredentialsRepository } from "src/modules/credentials/credentials.repository";
import { OAuthClientModule } from "src/modules/oauth-clients/oauth-client.module";
import { PrismaModule } from "src/modules/prisma/prisma.module";
import { SelectedCalendarsRepository } from "src/modules/selected-calendars/selected-calendars.repository";
import { TokensModule } from "src/modules/tokens/tokens.module";
import { UsersRepository } from "src/modules/users/users.repository";

@Module({
  imports: [PrismaModule, TokensModule, OAuthClientModule],
  providers: [
    AppsRepository,
    ConfigService,
    CredentialsRepository,
    SelectedCalendarsRepository,
    GCalService,
    CalendarsService,
    UsersRepository,
    CalendarsRepository,
  ],
  controllers: [GcalController],
})
export class GcalModule {}
