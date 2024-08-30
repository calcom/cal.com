import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { ApiKeyModule } from "src/modules/api-key/api-key.module";
import { ApiAuthGuard } from "src/modules/auth/guards/api-auth/api-auth.guard";
import { NextAuthGuard } from "src/modules/auth/guards/next-auth/next-auth.guard";
import { ApiAuthStrategy } from "src/modules/auth/strategies/api-auth/api-auth.strategy";
import { NextAuthStrategy } from "src/modules/auth/strategies/next-auth/next-auth.strategy";
import { DeploymentsModule } from "src/modules/deployments/deployments.module";
import { MembershipsModule } from "src/modules/memberships/memberships.module";
import { OAuthFlowService } from "src/modules/oauth-clients/services/oauth-flow.service";
import { ProfilesModule } from "src/modules/profiles/profiles.module";
import { RedisModule } from "src/modules/redis/redis.module";
import { TokensModule } from "src/modules/tokens/tokens.module";
import { UsersModule } from "src/modules/users/users.module";

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
