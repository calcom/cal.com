import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";

import { ApiKeysModule } from "../api-keys/api-keys.module";
import { ApiAuthGuard } from "../auth/guards/api-auth/api-auth.guard";
import { NextAuthGuard } from "../auth/guards/next-auth/next-auth.guard";
import { ApiAuthStrategy } from "../auth/strategies/api-auth/api-auth.strategy";
import { NextAuthStrategy } from "../auth/strategies/next-auth/next-auth.strategy";
import { DeploymentsModule } from "../deployments/deployments.module";
import { MembershipsModule } from "../memberships/memberships.module";
import { OAuthFlowService } from "../oauth-clients/services/oauth-flow.service";
import { ProfilesModule } from "../profiles/profiles.module";
import { RedisModule } from "../redis/redis.module";
import { TokensModule } from "../tokens/tokens.module";
import { UsersModule } from "../users/users.module";

@Module({
  imports: [
    PassportModule,
    RedisModule,
    ApiKeysModule,
    UsersModule,
    MembershipsModule,
    TokensModule,
    DeploymentsModule,
    ProfilesModule,
  ],
  providers: [NextAuthGuard, NextAuthStrategy, ApiAuthGuard, ApiAuthStrategy, OAuthFlowService],
  exports: [NextAuthGuard, ApiAuthGuard],
})
export class AuthModule {}
