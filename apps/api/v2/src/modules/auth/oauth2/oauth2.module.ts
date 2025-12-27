import { oAuthServiceModule } from "@/lib/modules/oauth.module";
import { PrismaAccessCodeRepository } from "@/lib/repositories/prisma-access-code.repository";
import { PrismaOAuthClientRepository } from "@/lib/repositories/prisma-oauth-client.repository";
import { PrismaTeamRepository } from "@/lib/repositories/prisma-team.repository";
import { OAuthService } from "@/lib/services/oauth.service";
import { OAuth2Controller } from "@/modules/auth/oauth2/controllers/oauth2.controller";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaModule, oAuthServiceModule],
  controllers: [OAuth2Controller],
  providers: [OAuthService, PrismaAccessCodeRepository, PrismaOAuthClientRepository, PrismaTeamRepository],
  exports: [OAuthService],
})
export class OAuth2Module {}
