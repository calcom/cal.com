import { Module } from "@nestjs/common";
import { oAuthServiceModule } from "@/lib/modules/oauth.module";
import { OAuth2Controller } from "@/modules/auth/oauth2/controllers/oauth2.controller";
import { OAuth2ErrorHandler } from "@/modules/auth/oauth2/services/oauth2-error.handler";

@Module({
  imports: [oAuthServiceModule],
  controllers: [OAuth2Controller],
  providers: [OAuth2ErrorHandler],
})
export class OAuth2Module {}
