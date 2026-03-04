import { Module } from "@nestjs/common";
import { EventTypesModule_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/event-types.module";
import { EventTypesPrivateLinksController_2024_09_04 } from "@/ee/event-types-private-links/2024-09-04/controllers/event-types-private-links.controller";
import { PrivateLinksService_2024_09_04 } from "@/ee/event-types-private-links/2024-09-04/services/private-links.service";
import { PrivateLinksRepository } from "@/ee/event-types-private-links/shared/private-links.repository";
import { PrivateLinksInputService } from "@/ee/event-types-private-links/shared/private-links-input.service";
import { PrivateLinksOutputService } from "@/ee/event-types-private-links/shared/private-links-output.service";
import { EventTypeOwnershipGuard } from "@/modules/event-types/guards/event-type-ownership.guard";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { TokensModule } from "@/modules/tokens/tokens.module";

@Module({
  imports: [TokensModule, PrismaModule, EventTypesModule_2024_06_14],
  controllers: [EventTypesPrivateLinksController_2024_09_04],
  providers: [
    PrivateLinksService_2024_09_04,
    PrivateLinksInputService,
    PrivateLinksOutputService,
    PrivateLinksRepository,
    EventTypeOwnershipGuard,
  ],
  exports: [PrivateLinksService_2024_09_04],
})
export class EventTypesPrivateLinksModule_2024_09_04 {}
