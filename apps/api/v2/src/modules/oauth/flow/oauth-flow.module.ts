import { getEnv } from "@/env";
import { OAuthFlowController } from "@/modules/oauth/flow/oauth-flow.controller";
import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";

@Module({
  imports: [
    JwtModule.register({
      secret: getEnv("NEXTAUTH_SECRET"),
    }),
  ],
  controllers: [OAuthFlowController],
})
export class OAuthFlowModule {}
