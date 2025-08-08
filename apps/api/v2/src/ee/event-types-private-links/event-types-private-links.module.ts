import { Module } from "@nestjs/common";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { OAuthClientModule } from "@/modules/oauth-clients/oauth-client.module";
import { PrismaModule } from "@/modules/prisma/prisma.module";

import { EventTypesPrivateLinksController } from "./controllers/event-types-private-links.controller";
import { PrivateLinksInputService } from "./services/private-links-input.service";
import { PrivateLinksOutputService } from "./services/private-links-output.service";
import { PrivateLinksService } from "./services/private-links.service";
import { PrivateLinksRepository } from "./private-links.repository";

@Module({
  imports: [TokensModule, OAuthClientModule, PrismaModule],
  controllers: [EventTypesPrivateLinksController],
  providers: [PrivateLinksService, PrivateLinksInputService, PrivateLinksOutputService, PrivateLinksRepository],
})
export class EventTypesPrivateLinksModule {}


