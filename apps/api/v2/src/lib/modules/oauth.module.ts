import { PrismaAccessCodeRepository } from "@/lib/repositories/prisma-access-code.repository";
import { PrismaOAuthClientRepository } from "@/lib/repositories/prisma-oauth-client.repository";
import { PrismaTeamRepository } from "@/lib/repositories/prisma-team.repository";
import { OAuthService } from "@/lib/services/oauth.service";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaModule],
  providers: [PrismaAccessCodeRepository, PrismaOAuthClientRepository, PrismaTeamRepository, OAuthService],
  exports: [OAuthService],
})
export class oAuthServiceModule {}
