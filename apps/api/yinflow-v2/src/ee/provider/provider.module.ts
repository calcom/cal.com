import { Module } from "@nestjs/common";

import { CredentialsRepository } from "../../modules/credentials/credentials.repository";
import { OAuthClientModule } from "../../modules/oauth-clients/oauth-client.module";
import { TokensModule } from "../../modules/tokens/tokens.module";
import { CalProviderController } from "./provider.controller";

@Module({
  imports: [TokensModule, OAuthClientModule],
  providers: [CredentialsRepository],
  controllers: [CalProviderController],
})
export class ProviderModule {}
