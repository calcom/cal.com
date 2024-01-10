import { GcalModule } from "@/ee/gcal/gcal.module";
import { ProviderModule } from "@/ee/provider/provider.module";
import type { MiddlewareConsumer, NestModule } from "@nestjs/common";
import { Module } from "@nestjs/common";

@Module({
  imports: [GcalModule, ProviderModule],
})
export class PlatformEndpointsModule implements NestModule {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  configure(_consumer: MiddlewareConsumer) {
    // TODO: apply ratelimits
  }
}
