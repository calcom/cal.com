import { oAuthServiceModule } from "@/lib/modules/oauth.module";
import { OAuth2Controller } from "@/modules/auth/oauth2/controllers/oauth2.controller";
import { OAuth2TokenController } from "@/modules/auth/oauth2/controllers/oauth2-token.controller";
import { Module } from "@nestjs/common";

@Module({
  imports: [oAuthServiceModule],
  controllers: [OAuth2Controller, OAuth2TokenController],
})
export class OAuth2Module {}
