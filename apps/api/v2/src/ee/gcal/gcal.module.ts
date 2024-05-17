import { CalendarsService } from "@/ee/calendars/services/calendars.service";
import { GcalController } from "@/ee/gcal/gcal.controller";
import { AppsRepository } from "@/modules/apps/apps.repository";
import { GCalService } from "@/modules/apps/services/gcal.service";
import { CredentialsRepository } from "@/modules/credentials/credentials.repository";
import { OAuthClientModule } from "@/modules/oauth-clients/oauth-client.module";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { SelectedCalendarsRepository } from "@/modules/selected-calendars/selected-calendars.repository";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { UsersRepository } from "@/modules/users/users.repository";
import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

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
  ],
  controllers: [GcalController],
})
export class GcalModule {}
