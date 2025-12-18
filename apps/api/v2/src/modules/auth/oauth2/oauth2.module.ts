import { OAuth2Controller } from "@/modules/auth/oauth2/controllers/oauth2.controller";
import { OAuth2Repository } from "@/modules/auth/oauth2/oauth2.repository";
import { AccessCodeRepository } from "@/modules/auth/oauth2/repositories/access-code.repository";
import { OAuth2Service } from "@/modules/auth/oauth2/services/oauth2.service";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { TeamsModule } from "@/modules/teams/teams/teams.module";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaModule, TeamsModule],
  controllers: [OAuth2Controller],
  providers: [OAuth2Service, OAuth2Repository, AccessCodeRepository],
  exports: [OAuth2Service],
})
export class OAuth2Module {}
