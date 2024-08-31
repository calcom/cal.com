import { Module } from "@nestjs/common";
import { CalProviderController } from "src/ee/provider/provider.controller";
import { CredentialsRepository } from "src/modules/credentials/credentials.repository";
import { OAuthClientModule } from "src/modules/oauth-clients/oauth-client.module";
import { PrismaModule } from "src/modules/prisma/prisma.module";
import { TokensModule } from "src/modules/tokens/tokens.module";

@Module({
  imports: [PrismaModule, TokensModule, OAuthClientModule],
  providers: [CredentialsRepository],
  controllers: [CalProviderController],
})
export class ProviderModule {}
