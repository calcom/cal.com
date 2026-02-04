import { PlatformEndpointsModule } from "@/ee/platform-endpoints-module";
import { AtomsModule } from "@/modules/atoms/atoms.module";
import { OAuth2Module } from "@/modules/auth/oauth2/oauth2.module";
import { BillingModule } from "@/modules/billing/billing.module";
import { CalUnifiedCalendarsModule } from "@/modules/cal-unified-calendars/cal-unified-calendars.module";
import { ConferencingModule } from "@/modules/conferencing/conferencing.module";
import { DestinationCalendarsModule } from "@/modules/destination-calendars/destination-calendars.module";
import { OAuthClientModule } from "@/modules/oauth-clients/oauth-client.module";
import { OrganizationsBookingsModule } from "@/modules/organizations/bookings/organizations.bookings.module";
import { OrganizationsRoutingFormsModule } from "@/modules/organizations/routing-forms/organizations-routing-forms.module";
import { OrganizationsTeamsBookingsModule } from "@/modules/organizations/teams/bookings/organizations-teams-bookings.module";
import { OrganizationsUsersBookingsModule } from "@/modules/organizations/users/bookings/organizations-users-bookings.module";
import { RouterModule } from "@/modules/router/router.module";
import { StripeModule } from "@/modules/stripe/stripe.module";
import { TeamsBookingsModule } from "@/modules/teams/bookings/teams-bookings.module";
import { TeamsSchedulesModule } from "@/modules/teams/schedules/teams-schedules.module";
import { TimezoneModule } from "@/modules/timezones/timezones.module";
import { VerifiedResourcesModule } from "@/modules/verified-resources/verified-resources.module";
import type { MiddlewareConsumer, NestModule } from "@nestjs/common";
import { Module } from "@nestjs/common";

import { UsersModule } from "./users/users.module";
import { WebhooksModule } from "./webhooks/webhooks.module";

@Module({
  imports: [
    OAuth2Module,
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
    CalUnifiedCalendarsModule,
    OrganizationsTeamsBookingsModule,
    OrganizationsUsersBookingsModule,
    OrganizationsBookingsModule,
    OrganizationsRoutingFormsModule,
    VerifiedResourcesModule,
    RouterModule,
    TeamsSchedulesModule,
    TeamsBookingsModule,
  ],
})
export class EndpointsModule implements NestModule {
   
  configure(_consumer: MiddlewareConsumer) {
    // TODO: apply ratelimits
  }
}
