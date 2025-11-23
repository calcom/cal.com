import { EventTypesModule_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/event-types.module";
import { EventTypeOwnershipGuard } from "@/modules/event-types/guards/event-type-ownership.guard";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { Module } from "@nestjs/common";

import { EventTypesPrivateLinksController } from "./controllers/event-types-private-links.controller";
import { PrivateLinksRepository } from "./private-links.repository";
import { PrivateLinksInputService } from "./services/private-links-input.service";
import { PrivateLinksOutputService } from "./services/private-links-output.service";
import { PrivateLinksService } from "./services/private-links.service";

@Module({
  imports: [TokensModule, PrismaModule, EventTypesModule_2024_06_14],
  controllers: [EventTypesPrivateLinksController],
  providers: [
    PrivateLinksService,
    PrivateLinksInputService,
    PrivateLinksOutputService,
    PrivateLinksRepository,
    EventTypeOwnershipGuard,
  ],
  exports: [PrivateLinksService],
})
export class EventTypesPrivateLinksModule {}
