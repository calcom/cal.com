import { Module } from "@nestjs/common";
import { EventTypesModule_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/event-types.module";
import { EventTypeWebhooksController } from "@/modules/event-types/controllers/event-types-webhooks.controller";
import { OAuthClientWebhooksController } from "@/modules/oauth-clients/controllers/oauth-client-webhooks/oauth-client-webhooks.controller";
import { OAuthClientModule } from "@/modules/oauth-clients/oauth-client.module";
import { TeamsEventTypesRepository } from "@/modules/teams/event-types/teams-event-types.repository";

import { MembershipsModule } from "../memberships/memberships.module";
import { OrganizationsModule } from "../organizations/organizations.module";
import { PrismaModule } from "../prisma/prisma.module";
import { UsersModule } from "../users/users.module";
import { WebhooksController } from "./controllers/webhooks.controller";
import { IsTeamEventTypeWebhookGuard } from "./guards/is-team-event-type-webhook-guard";
import { EventTypeWebhooksService } from "./services/event-type-webhooks.service";
import { OAuthClientWebhooksService } from "./services/oauth-clients-webhooks.service";
import { TeamEventTypeWebhooksService } from "./services/team-event-type-webhooks.service";
import { UserWebhooksService } from "./services/user-webhooks.service";
import { WebhooksService } from "./services/webhooks.service";
import { WebhooksRepository } from "./webhooks.repository";

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
    TeamEventTypeWebhooksService,
    IsTeamEventTypeWebhookGuard,
    TeamsEventTypesRepository,
  ],
  exports: [
    WebhooksService,
    WebhooksRepository,
    UserWebhooksService,
    EventTypeWebhooksService,
    OAuthClientWebhooksService,
    TeamEventTypeWebhooksService,
    IsTeamEventTypeWebhookGuard,
  ],
})
export class WebhooksModule {}
