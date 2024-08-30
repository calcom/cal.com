import type { MiddlewareConsumer, NestModule } from "@nestjs/common";
import { Module } from "@nestjs/common";
import { PlatformEndpointsModule } from "app/ee/platform-endpoints-module";
import { BillingModule } from "app/modules/billing/billing.module";
import { DestinationCalendarsModule } from "app/modules/destination-calendars/destination-calendars.module";
import { OAuthClientModule } from "app/modules/oauth-clients/oauth-client.module";
import { TimezoneModule } from "app/modules/timezones/timezones.module";

import { UsersModule } from "./users/users.module";
import { WebhooksModule } from "./webhooks/webhooks.module";

@Module({
  imports: [
    OAuthClientModule,
    BillingModule,
    PlatformEndpointsModule,
    TimezoneModule,
    UsersModule,
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
