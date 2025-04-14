import { PlatformEndpointsModule } from "@/ee/platform-endpoints-module";
import { AtomsModule } from "@/modules/atoms/atoms.module";
import { BillingModule } from "@/modules/billing/billing.module";
import { ConferencingModule } from "@/modules/conferencing/conferencing.module";
import { DestinationCalendarsModule } from "@/modules/destination-calendars/destination-calendars.module";
import { OAuthClientModule } from "@/modules/oauth-clients/oauth-client.module";
import { OrganizationsBookingsModule } from "@/modules/organizations/bookings/organizations.bookings.module";
import { OrganizationsRoutingFormsModule } from "@/modules/organizations/routing-forms/organizations-routing-forms.module";
import { OrganizationsTeamsBookingsModule } from "@/modules/organizations/teams/bookings/organizations-teams-bookings.module";
import { OrganizationsUsersBookingsModule } from "@/modules/organizations/users/bookings/organizations-users-bookings.module";
import { RouterModule } from "@/modules/router/router.module";
import { StripeModule } from "@/modules/stripe/stripe.module";
import { TimezoneModule } from "@/modules/timezones/timezones.module";
import type { MiddlewareConsumer, NestModule } from "@nestjs/common";
import { Module } from "@nestjs/common";

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
    OrganizationsUsersBookingsModule,
    OrganizationsBookingsModule,
    OrganizationsRoutingFormsModule,
    RouterModule,
  ],
})
export class EndpointsModule implements NestModule {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  configure(_consumer: MiddlewareConsumer) {
    // TODO: apply ratelimits
  }
}
