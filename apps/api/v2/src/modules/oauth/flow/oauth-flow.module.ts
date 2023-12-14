import { getEnv } from "@/env";
import { AuthorizationTokenStrategy } from "@/modules/auth/strategy/oauth/authorization.strategy";
import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";

@Module({
  imports: [
    JwtModule.register({
      secret: getEnv("NEXTAUTH_SECRET"),
      signOptions: { expiresIn: "60s" }, // authorization tokens
    }),
  ],
  providers: [AuthorizationTokenStrategy],
})
export class OAuthFlowModule {}
