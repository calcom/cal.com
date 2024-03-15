import { BookingsModule } from "@/ee/bookings/bookings.module";
import { CalendarsModule } from "@/ee/calendars/calendars.module";
import { EventTypesModule } from "@/ee/event-types/event-types.module";
import { GcalModule } from "@/ee/gcal/gcal.module";
import { MeModule } from "@/ee/me/me.module";
import { ProviderModule } from "@/ee/provider/provider.module";
import { SchedulesModule } from "@/ee/schedules/schedules.module";
import { SlotsModule } from "@/modules/slots/slots.module";
import type { MiddlewareConsumer, NestModule } from "@nestjs/common";
import { Module } from "@nestjs/common";

@Module({
  imports: [
    GcalModule,
    ProviderModule,
    SchedulesModule,
    MeModule,
    EventTypesModule,
    CalendarsModule,
    BookingsModule,
    SlotsModule,
  ],
})
export class PlatformEndpointsModule implements NestModule {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  configure(_consumer: MiddlewareConsumer) {
    // TODO: apply ratelimits
  }
}
