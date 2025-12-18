import { OAuth2Controller } from "@/modules/auth/oauth2/controllers/oauth2.controller";
import { AccessCodeRepository } from "@/modules/auth/oauth2/repositories/access-code.repository";
import { OAuth2ClientRepository } from "@/modules/auth/oauth2/repositories/oauth2-client.repository";
import { OAuth2Service } from "@/modules/auth/oauth2/services/oauth2.service";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { TeamsModule } from "@/modules/teams/teams/teams.module";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

@Module({
  imports: [PrismaModule, TeamsModule, ConfigModule],
  controllers: [OAuth2Controller],
  providers: [OAuth2Service, OAuth2ClientRepository, AccessCodeRepository],
  exports: [OAuth2Service],
})
export class OAuth2Module {}
