import type { MiddlewareConsumer, NestModule } from "@nestjs/common";
import { Module } from "@nestjs/common";

import { PlatformEndpointsModule } from "../ee/platform-endpoints-module";
import { BillingModule } from "./billing/billing.module";
import { DestinationCalendarsModule } from "./destination-calendars/destination-calendars.module";
import { DirectusModule } from "./directus/directus.module";
import { OAuthClientModule } from "./oauth-clients/oauth-client.module";
import { TimezoneModule } from "./timezones/timezones.module";
import { UsersModule } from "./users/users.module";
import { WebhooksModule } from "./webhooks/webhooks.module";

@Module({
  imports: [
    OAuthClientModule,
    BillingModule,
    PlatformEndpointsModule,
    TimezoneModule,
    UsersModule,
    DirectusModule,
    WebhooksModule,
    DestinationCalendarsModule,
  ],
})
export class EndpointsModule implements NestModule {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  configure(_consumer: MiddlewareConsumer) {
    // TODO: apply ratelimits
  }
}
