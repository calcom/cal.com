import { BookingModule } from "@/modules/booking/booking.module";
import { OAuthClientModule } from "@/modules/oauth/oauth-client.module";
import { UserModule } from "@/modules/user/user.module";
import type { MiddlewareConsumer, NestModule } from "@nestjs/common";
import { Module } from "@nestjs/common";

@Module({
  imports: [BookingModule, OAuthClientModule, UserModule],
})
export class EndpointsModule implements NestModule {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  configure(_consumer: MiddlewareConsumer) {
    // TODO: apply ratelimits
  }
}
