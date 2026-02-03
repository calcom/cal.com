import { oAuthServiceModule } from "@/lib/modules/oauth.module";
import { OAuth2Controller } from "@/modules/auth/oauth2/controllers/oauth2.controller";
import { Module } from "@nestjs/common";

@Module({
  imports: [oAuthServiceModule],
  controllers: [OAuth2Controller],
})
export class OAuth2Module {}
