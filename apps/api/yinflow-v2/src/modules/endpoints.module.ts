import type { MiddlewareConsumer, NestModule } from "@nestjs/common";
import { Module } from "@nestjs/common";

import { PlatformEndpointsModule } from "../ee/platform-endpoints-module";
import { AtomsModule } from "./atoms/atoms.module";
import { BillingModule } from "./billing/billing.module";
import { ConferencingModule } from "./conferencing/conferencing.module";
import { DestinationCalendarsModule } from "./destination-calendars/destination-calendars.module";
import { OAuthClientModule } from "./oauth-clients/oauth-client.module";
import { OrganizationsTeamsBookingsModule } from "./organizations/teams/bookings/organizations-teams-bookings.module";
import { RouterModule } from "./router/router.module";
import { StripeModule } from "./stripe/stripe.module";
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
    WebhooksModule,
    DestinationCalendarsModule,
    AtomsModule,
    StripeModule,
    ConferencingModule,
    OrganizationsTeamsBookingsModule,
    RouterModule,
  ],
})
export class EndpointsModule implements NestModule {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  configure(_consumer: MiddlewareConsumer) {
    // TODO: apply ratelimits
  }
}
