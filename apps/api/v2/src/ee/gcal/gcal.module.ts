import { GcalController } from "@/ee/gcal/gcal.controller";
import { CredentialsRepository } from "@/modules/credentials/credentials.repository";
import { OAuthClientModule } from "@/modules/oauth-clients/oauth-client.module";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaModule, TokensModule, OAuthClientModule],
  providers: [CredentialsRepository],
  controllers: [GcalController],
})
export class GcalModule {}
