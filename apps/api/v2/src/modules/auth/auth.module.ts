import { ApiKeyModule } from "@/modules/api-key/api-key.module";
import { ApiKeyAuthStrategy } from "@/modules/auth/auth-api-key.strategy";
import { NextAuthGuard } from "@/modules/auth/next-auth.guard";
import { UserModule } from "@/modules/repositories/user/user-repository.module";
import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";

@Module({
  imports: [PassportModule, ApiKeyModule, UserModule],
  providers: [ApiKeyAuthStrategy, NextAuthGuard],
  exports: [NextAuthGuard],
})
export class AuthModule {}
