import type { MiddlewareConsumer, NestModule } from "@nestjs/common";
import { Module } from "@nestjs/common";
import { PlatformEndpointsModule } from "src/ee/platform-endpoints-module";
import { BillingModule } from "src/modules/billing/billing.module";
import { DestinationCalendarsModule } from "src/modules/destination-calendars/destination-calendars.module";
import { OAuthClientModule } from "src/modules/oauth-clients/oauth-client.module";
import { TimezoneModule } from "src/modules/timezones/timezones.module";

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
