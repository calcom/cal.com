import { Module } from "@nestjs/common";

import { CredentialsRepository } from "../../modules/credentials/credentials.repository";
import { OAuthClientModule } from "../../modules/oauth-clients/oauth-client.module";
import { PrismaModule } from "../../modules/prisma/prisma.module";
import { TokensModule } from "../../modules/tokens/tokens.module";
import { CalProviderController } from "../provider/provider.controller";

@Module({
  imports: [PrismaModule, TokensModule, OAuthClientModule],
  providers: [CredentialsRepository],
  controllers: [CalProviderController],
})
export class ProviderModule {}
