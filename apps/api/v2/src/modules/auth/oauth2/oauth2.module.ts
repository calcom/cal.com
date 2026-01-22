import { oAuthServiceModule } from "@/lib/modules/oauth.module";
import { AtomsOAuth2Controller } from "@/modules/auth/oauth2/controllers/atoms-oauth2.controller";
import { OAuth2Controller } from "@/modules/auth/oauth2/controllers/oauth2.controller";
import { Module } from "@nestjs/common";

@Module({
  imports: [oAuthServiceModule],
  controllers: [OAuth2Controller, AtomsOAuth2Controller],
})
export class OAuth2Module {}
