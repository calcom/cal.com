import { ApiKeyModule } from "@/modules/api-key/api-key.module";
import { ApiKeyAuthStrategy } from "@/modules/auth/auth-api-key.strategy";
import { NextAuthGuard } from "@/modules/auth/guard";
import { NextAuthStrategy } from "@/modules/auth/strategy";
import { MembershipModule } from "@/modules/repositories/membership/membership-repository.module";
import { UserModule } from "@/modules/repositories/user/user-repository.module";
import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";

@Module({
  imports: [PassportModule, JwtModule.register({}), ApiKeyModule, UserModule, MembershipModule],
  providers: [ApiKeyAuthStrategy, NextAuthGuard, NextAuthStrategy],
  exports: [NextAuthGuard],
})
export class AuthModule {}
