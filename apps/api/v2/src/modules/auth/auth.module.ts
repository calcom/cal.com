import { NextAuthGuard } from "@/modules/auth/guards";
import { NextAuthStrategy } from "@/modules/auth/strategies";
import { ApiKeyAuthStrategy } from "@/modules/auth/strategies/api-key-auth/api-key-auth.strategy";
import { MembershipModule } from "@/modules/repositories/membership/membership.module";
import { UserModule } from "@/modules/repositories/user/user.module";
import { ApiKeyModule } from "@/modules/services/api-key/api-key.module";
import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";

@Module({
  imports: [PassportModule, JwtModule.register({}), ApiKeyModule, UserModule, MembershipModule],
  providers: [ApiKeyAuthStrategy, NextAuthGuard, NextAuthStrategy],
  exports: [NextAuthGuard],
})
export class AuthModule {}
