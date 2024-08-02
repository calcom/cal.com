import { EventTypesModule_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/event-types.module";
import { EventTypeWebhooksController } from "@/modules/event-types/controllers/event-types-webhooks.controller";
import { Module } from "@nestjs/common";

import { PrismaModule } from "../prisma/prisma.module";
import { UsersModule } from "../users/users.module";
import { WebhooksController } from "./controllers/webhooks.controller";
import { EventTypeWebhooksService } from "./services/event-type-webhooks.service";
import { UserWebhooksService } from "./services/user-webhooks.service";
import { WebhooksService } from "./services/webhooks.service";
import { WebhooksRepository } from "./webhooks.repository";

@Module({
  imports: [PrismaModule, UsersModule, EventTypesModule_2024_06_14],
  controllers: [WebhooksController, EventTypeWebhooksController],
  providers: [WebhooksService, WebhooksRepository, UserWebhooksService, EventTypeWebhooksService],
  exports: [WebhooksService, WebhooksRepository, UserWebhooksService, EventTypeWebhooksService],
})
export class WebhooksModule {}
