import { getEnv } from "@/env";
import { OAuthFlowController } from "@/modules/oauth/flow/oauth-flow.controller";
import { OAuthFlowService } from "@/modules/oauth/flow/oauth-flow.service";
import { OAuthClientRepository } from "@/modules/oauth/oauth-client.repository";
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
  ],
  controllers: [OAuthFlowController],
  providers: [TokensRepository, OAuthClientRepository, OAuthFlowService],
  exports: [OAuthFlowService],
})
export class OAuthFlowModule {}
