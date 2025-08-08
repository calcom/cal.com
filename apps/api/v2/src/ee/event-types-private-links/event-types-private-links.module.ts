import { Module } from "@nestjs/common";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { OAuthClientModule } from "@/modules/oauth-clients/oauth-client.module";

import { EventTypesPrivateLinksController } from "./event-types-private-links.controller";
import { PrivateLinksInputService } from "./services/private-links-input.service";
import { PrivateLinksOutputService } from "./services/private-links-output.service";
import { PrivateLinksService } from "./services/private-links.service";

@Module({
  imports: [TokensModule, OAuthClientModule],
  controllers: [EventTypesPrivateLinksController],
  providers: [PrivateLinksService, PrivateLinksInputService, PrivateLinksOutputService],
})
export class EventTypesPrivateLinksModule {}


