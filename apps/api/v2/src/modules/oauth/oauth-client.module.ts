import { getEnv } from "@/env";
import { AuthModule } from "@/modules/auth/auth.module";
import { MembershipModule } from "@/modules/membership/membership.module";
import { OAuthClientGuard } from "@/modules/oauth/guard/oauth-client/oauth-client.guard";
import { OAuthClientController } from "@/modules/oauth/oauth-client.controller";
import { OAuthClientRepository } from "@/modules/oauth/oauth-client.repository";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { UserModule } from "@/modules/user/user.module";
import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UserModule,
    MembershipModule,
    JwtModule.register({ secret: getEnv("JWT_SECRET") }),
  ],
  providers: [OAuthClientRepository, OAuthClientGuard],
  controllers: [OAuthClientController],
  exports: [OAuthClientGuard],
})
export class OAuthClientModule {}
