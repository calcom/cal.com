import { BookingsModule_2024_04_15 } from "@/ee/bookings/2024-04-15/bookings.module";
import { BookingsModule_2024_08_13 } from "@/ee/bookings/2024-08-13/bookings.module";
import { CalendarsModule } from "@/ee/calendars/calendars.module";
import { EventTypesPrivateLinksModule } from "@/ee/event-types-private-links/event-types-private-links.module";
import { EventTypesModule_2024_04_15 } from "@/ee/event-types/event-types_2024_04_15/event-types.module";
import { EventTypesModule_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/event-types.module";
import { GcalModule } from "@/ee/gcal/gcal.module";
import { MeModule } from "@/ee/me/me.module";
import { ProviderModule } from "@/ee/provider/provider.module";
import { SchedulesModule_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/schedules.module";
import { SchedulesModule_2024_06_11 } from "@/ee/schedules/schedules_2024_06_11/schedules.module";
import { RoutingFormsModule } from "@/modules/routing-forms/routing-forms.module";
import { SlotsModule_2024_04_15 } from "@/modules/slots/slots-2024-04-15/slots.module";
import { SlotsModule_2024_09_04 } from "@/modules/slots/slots-2024-09-04/slots.module";
import { TeamsEventTypesModule } from "@/modules/teams/event-types/teams-event-types.module";
import { TeamsInviteModule } from "@/modules/teams/invite/teams-invite.module";
import { TeamsMembershipsModule } from "@/modules/teams/memberships/teams-memberships.module";
import { TeamsModule } from "@/modules/teams/teams/teams.module";
import type { MiddlewareConsumer, NestModule } from "@nestjs/common";
import { Module } from "@nestjs/common";

@Module({
  imports: [
    GcalModule,
    ProviderModule,
    SchedulesModule_2024_04_15,
    SchedulesModule_2024_06_11,
    TeamsEventTypesModule,
    MeModule,
    EventTypesModule_2024_04_15,
    EventTypesModule_2024_06_14,
    CalendarsModule,
    BookingsModule_2024_04_15,
    BookingsModule_2024_08_13,
    TeamsMembershipsModule,
    TeamsInviteModule,
    SlotsModule_2024_04_15,
    SlotsModule_2024_09_04,
    TeamsModule,
    RoutingFormsModule,
    EventTypesPrivateLinksModule,
  ],
})
export class PlatformEndpointsModule implements NestModule {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  configure(_consumer: MiddlewareConsumer) {
    // TODO: apply ratelimits
  }
}
