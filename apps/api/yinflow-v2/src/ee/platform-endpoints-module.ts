import type { MiddlewareConsumer, NestModule } from "@nestjs/common";
import { Module } from "@nestjs/common";

import { SlotsModule } from "../modules/slots/slots.module";
import { BookingsModule } from "./bookings/bookings.module";
import { CalendarsModule } from "./calendars/calendars.module";
import { EventTypesModule_2024_04_15 } from "./event-types/event-types_2024_04_15/event-types.module";
import { EventTypesModule_2024_06_14 } from "./event-types/event-types_2024_06_14/event-types.module";
import { GcalModule } from "./gcal/gcal.module";
import { MeModule } from "./me/me.module";
import { ProviderModule } from "./provider/provider.module";
import { SchedulesModule_2024_04_15 } from "./schedules/schedules_2024_04_15/schedules.module";
import { SchedulesModule_2024_06_11 } from "./schedules/schedules_2024_06_11/schedules.module";

@Module({
  imports: [
    GcalModule,
    ProviderModule,
    SchedulesModule_2024_04_15,
    SchedulesModule_2024_06_11,
    MeModule,
    EventTypesModule_2024_04_15,
    EventTypesModule_2024_06_14,
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
