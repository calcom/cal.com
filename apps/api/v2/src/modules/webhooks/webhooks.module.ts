import { EventTypesModule_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/event-types.module";
import { Module } from "@nestjs/common";

import { PrismaModule } from "../prisma/prisma.module";
import { UsersModule } from "../users/users.module";
import { WebhooksController } from "./controllers/webhooks.controller";
import { WebhooksService } from "./services/webhooks.service";
import { WebhooksRepository } from "./webhooks.repository";

@Module({
  imports: [PrismaModule, UsersModule, EventTypesModule_2024_06_14],
  controllers: [WebhooksController],
  providers: [WebhooksService, WebhooksRepository],
  exports: [WebhooksService, WebhooksRepository],
})
export class WebhooksModule {}
