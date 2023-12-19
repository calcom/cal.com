import { getEnv } from "@/env";
import { OAuthFlowController } from "@/modules/oauth/flow/oauth-flow.controller";
import { OAuthFlowService } from "@/modules/oauth/flow/oauth-flow.service";
import { OAuthClientModule } from "@/modules/oauth/oauth-client.module";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { TokensRepository } from "@/modules/tokens/tokens.repository";
import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";

@Module({
  imports: [
    JwtModule.register({
      secret: getEnv("NEXTAUTH_SECRET"),
    }),
    PrismaModule,
    OAuthClientModule,
  ],
  controllers: [OAuthFlowController],
  exports: [OAuthFlowService],
  providers: [OAuthFlowService, TokensRepository],
})
export class OAuthFlowModule {}
