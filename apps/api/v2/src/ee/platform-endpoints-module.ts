import { EventTypesModule } from "@/ee/event-types/event-types.module";
import { GcalModule } from "@/ee/gcal/gcal.module";
import { MeModule } from "@/ee/me/me.module";
import { OverlayCalendarsModule } from "@/ee/overlay-calendars/overlay-calendars.module";
import { ProviderModule } from "@/ee/provider/provider.module";
import { SchedulesModule } from "@/ee/schedules/schedules.module";
import type { MiddlewareConsumer, NestModule } from "@nestjs/common";
import { Module } from "@nestjs/common";

@Module({
  imports: [GcalModule, ProviderModule, SchedulesModule, MeModule, EventTypesModule, OverlayCalendarsModule],
})
export class PlatformEndpointsModule implements NestModule {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  configure(_consumer: MiddlewareConsumer) {
    // TODO: apply ratelimits
  }
}
