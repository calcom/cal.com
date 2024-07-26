import { EventTypesModule_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/event-types.module";
import { Module } from "@nestjs/common";

import { PrismaModule } from "../prisma/prisma.module";
import { UsersModule } from "../users/users.module";
import { EventTypeWebhooksController } from "./controllers/event-types-webhooks.controller";
import { WebhooksController } from "./controllers/webhooks.controller";
import { WebhooksService } from "./services/webhooks.service";
import { WebhooksRepository } from "./webhooks.repository";

@Module({
  imports: [PrismaModule, UsersModule, EventTypesModule_2024_06_14],
  controllers: [WebhooksController, EventTypeWebhooksController],
  providers: [WebhooksService, WebhooksRepository],
  exports: [WebhooksService, WebhooksRepository],
})
export class WebhooksModule {}
