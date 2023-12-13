import { ApiKeyModule } from "@/modules/api-key/api-key.module";
import { NextAuthGuard } from "@/modules/auth/guard";
import { NextAuthStrategy } from "@/modules/auth/strategy";
import { ApiKeyAuthStrategy } from "@/modules/auth/strategy/api-key-auth/api-key-auth.strategy";
import { MembershipModule } from "@/modules/membership/membership.module";
import { UserModule } from "@/modules/user/user.module";
import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";

@Module({
  imports: [PassportModule, JwtModule.register({}), ApiKeyModule, UserModule, MembershipModule],
  providers: [ApiKeyAuthStrategy, NextAuthGuard, NextAuthStrategy],
  exports: [NextAuthGuard],
})
export class AuthModule {}
