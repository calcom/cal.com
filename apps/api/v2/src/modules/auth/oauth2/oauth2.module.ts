import { Module } from "@nestjs/common";
import { oAuthServiceModule } from "@/lib/modules/oauth.module";
import { AtomsOAuth2Controller } from "@/modules/auth/oauth2/controllers/atoms-oauth2.controller";
import { OAuth2Controller } from "@/modules/auth/oauth2/controllers/oauth2.controller";
import { OAuth2ErrorService } from "@/modules/auth/oauth2/services/oauth2-error.service";

@Module({
  imports: [oAuthServiceModule],
  controllers: [OAuth2Controller, AtomsOAuth2Controller],
  providers: [OAuth2ErrorService],
})
export class OAuth2Module {}
