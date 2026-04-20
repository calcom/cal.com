import { Module } from "@nestjs/common";
import { PrismaAccessCodeRepository } from "@/lib/repositories/prisma-access-code.repository";
import { PrismaOAuthClientRepository } from "@/lib/repositories/prisma-oauth-client.repository";
import { OAuthService } from "@/lib/services/oauth.service";
import { PrismaModule } from "@/modules/prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  providers: [PrismaAccessCodeRepository, PrismaOAuthClientRepository, OAuthService],
  exports: [OAuthService],
})
export class oAuthServiceModule {}
