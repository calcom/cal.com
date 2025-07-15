import { EventTypesModule_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/event-types.module";
import { EventTypeWebhooksController } from "@/modules/event-types/controllers/event-types-webhooks.controller";
import { OAuthClientWebhooksController } from "@/modules/oauth-clients/controllers/oauth-client-webhooks/oauth-client-webhooks.controller";
import { OAuthClientModule } from "@/modules/oauth-clients/oauth-client.module";
import { Module } from "@nestjs/common";

import { MembershipsModule } from "../memberships/memberships.module";
import { OrganizationsModule } from "../organizations/organizations.module";
import { PrismaModule } from "../prisma/prisma.module";
import { UsersModule } from "../users/users.module";
import { WebhooksController } from "./controllers/webhooks.controller";
import { EventTypeWebhooksService } from "./services/eventTypeWebhooksService";
import { OAuthClientWebhooksService } from "./services/oauthClientsWebhooksService";
import { UserWebhooksService } from "./services/userWebhooksService";
import { WebhooksService } from "./services/webhooksService";
import { WebhooksRepository } from "./webhooksRepository";

@Module({
  imports: [
    PrismaModule,
    UsersModule,
    EventTypesModule_2024_06_14,
    OAuthClientModule,
    OrganizationsModule,
    MembershipsModule,
    OAuthClientModule,
  ],
  controllers: [WebhooksController, EventTypeWebhooksController, OAuthClientWebhooksController],
  providers: [
    WebhooksService,
    WebhooksRepository,
    UserWebhooksService,
    EventTypeWebhooksService,
    OAuthClientWebhooksService,
  ],
  exports: [
    WebhooksService,
    WebhooksRepository,
    UserWebhooksService,
    EventTypeWebhooksService,
    OAuthClientWebhooksService,
  ],
})
export class WebhooksModule {}
