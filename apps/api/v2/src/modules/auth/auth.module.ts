import { ApiKeyModule } from "@/modules/api-key/api-key.module";
import { BearerGuard } from "@/modules/auth/guards/bearer/bearer.guard";
import { NextAuthGuard } from "@/modules/auth/guards/next-auth/next-auth.guard";
import { BearerStrategy } from "@/modules/auth/strategies/bearer/bearer.strategy";
import { NextAuthStrategy } from "@/modules/auth/strategies/next-auth/next-auth.strategy";
import { MembershipsModule } from "@/modules/memberships/memberships.module";
import { OAuthFlowService } from "@/modules/oauth-clients/services/oauth-flow.service";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { UsersModule } from "@/modules/users/users.module";
import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";

@Module({
  imports: [PassportModule, ApiKeyModule, UsersModule, MembershipsModule, TokensModule],
  providers: [NextAuthGuard, NextAuthStrategy, BearerGuard, BearerStrategy, OAuthFlowService],
  exports: [NextAuthGuard, BearerGuard],
})
export class AuthModule {}
