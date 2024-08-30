import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { ApiKeyModule } from "app/modules/api-key/api-key.module";
import { ApiAuthGuard } from "app/modules/auth/guards/api-auth/api-auth.guard";
import { NextAuthGuard } from "app/modules/auth/guards/next-auth/next-auth.guard";
import { ApiAuthStrategy } from "app/modules/auth/strategies/api-auth/api-auth.strategy";
import { NextAuthStrategy } from "app/modules/auth/strategies/next-auth/next-auth.strategy";
import { DeploymentsModule } from "app/modules/deployments/deployments.module";
import { MembershipsModule } from "app/modules/memberships/memberships.module";
import { OAuthFlowService } from "app/modules/oauth-clients/services/oauth-flow.service";
import { ProfilesModule } from "app/modules/profiles/profiles.module";
import { RedisModule } from "app/modules/redis/redis.module";
import { TokensModule } from "app/modules/tokens/tokens.module";
import { UsersModule } from "app/modules/users/users.module";

@Module({
  imports: [
    PassportModule,
    RedisModule,
    ApiKeyModule,
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
