import { CalProviderController } from "@/ee/atoms/controllers/cal-provider/cal-provider.controller";
import { GcalConnectController } from "@/ee/atoms/controllers/gcal-connect/gcal-connect.controller";
import { CredentialsRepository } from "@/modules/credentials/credentials.repository";
import { OAuthClientModule } from "@/modules/oauth-clients/oauth-client.module";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaModule, TokensModule, OAuthClientModule],
  providers: [CredentialsRepository],
  controllers: [CalProviderController, GcalConnectController],
})
export class AtomsModule {}
