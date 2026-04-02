import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { ApiKeysModule } from "@/modules/api-keys/api-keys.module";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { NextAuthGuard } from "@/modules/auth/guards/next-auth/next-auth.guard";
import { ApiAuthStrategy } from "@/modules/auth/strategies/api-auth/api-auth.strategy";
import { NextAuthStrategy } from "@/modules/auth/strategies/next-auth/next-auth.strategy";
import { DeploymentsModule } from "@/modules/deployments/deployments.module";
import { MembershipsModule } from "@/modules/memberships/memberships.module";
import { OAuthFlowService } from "@/modules/oauth-clients/services/oauth-flow.service";
import { RedisModule } from "@/modules/redis/redis.module";
import { RolesModule } from "@/modules/roles/roles.module";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { UsersModule } from "@/modules/users/users.module";

@Module({
  imports: [
    PassportModule,
    RedisModule,
    ApiKeysModule,
    UsersModule,
    MembershipsModule,
    TokensModule,
    DeploymentsModule,
    RolesModule,
  ],
  providers: [NextAuthGuard, NextAuthStrategy, ApiAuthGuard, ApiAuthStrategy, OAuthFlowService],
  exports: [NextAuthGuard, ApiAuthGuard],
})
export class AuthModule {}
