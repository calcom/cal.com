import { CalendarsRepository } from "@/ee/calendars/calendarsRepository";
import { CalendarsService } from "@/ee/calendars/services/calendarsService";
import { GcalController } from "@/ee/gcal/gcal.controller";
import { AppsRepository } from "@/modules/apps/appsRepository";
import { GCalService } from "@/modules/apps/services/gcalService";
import { CredentialsRepository } from "@/modules/credentials/credentialsRepository";
import { OAuthClientModule } from "@/modules/oauth-clients/oauth-client.module";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { SelectedCalendarsRepository } from "@/modules/selected-calendars/selectedCalendarsRepository";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { UsersRepository } from "@/modules/users/usersRepository";
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
    CalendarsRepository,
  ],
  controllers: [GcalController],
})
export class GcalModule {}
