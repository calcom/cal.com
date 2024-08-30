import { Module } from "@nestjs/common";
import { CalProviderController } from "app/ee/provider/provider.controller";
import { CredentialsRepository } from "app/modules/credentials/credentials.repository";
import { OAuthClientModule } from "app/modules/oauth-clients/oauth-client.module";
import { PrismaModule } from "app/modules/prisma/prisma.module";
import { TokensModule } from "app/modules/tokens/tokens.module";

@Module({
  imports: [PrismaModule, TokensModule, OAuthClientModule],
  providers: [CredentialsRepository],
  controllers: [CalProviderController],
})
export class ProviderModule {}
