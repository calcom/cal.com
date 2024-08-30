import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CalendarsRepository } from "app/ee/calendars/calendars.repository";
import { CalendarsService } from "app/ee/calendars/services/calendars.service";
import { GcalController } from "app/ee/gcal/gcal.controller";
import { AppsRepository } from "app/modules/apps/apps.repository";
import { GCalService } from "app/modules/apps/services/gcal.service";
import { CredentialsRepository } from "app/modules/credentials/credentials.repository";
import { OAuthClientModule } from "app/modules/oauth-clients/oauth-client.module";
import { PrismaModule } from "app/modules/prisma/prisma.module";
import { SelectedCalendarsRepository } from "app/modules/selected-calendars/selected-calendars.repository";
import { TokensModule } from "app/modules/tokens/tokens.module";
import { UsersRepository } from "app/modules/users/users.repository";

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
