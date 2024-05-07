import { ApiKeyModule } from "@/modules/api-key/api-key.module";
import { AccessTokenGuard } from "@/modules/auth/guards/access-token/access-token.guard";
import { NextAuthGuard } from "@/modules/auth/guards/next-auth/next-auth.guard";
import { AccessTokenStrategy } from "@/modules/auth/strategies/access-token/access-token.strategy";
import { ApiKeyAuthStrategy } from "@/modules/auth/strategies/api-key-auth/api-key-auth.strategy";
import { NextAuthStrategy } from "@/modules/auth/strategies/next-auth/next-auth.strategy";
import { MembershipsModule } from "@/modules/memberships/memberships.module";
import { OAuthFlowService } from "@/modules/oauth-clients/services/oauth-flow.service";
import { RedisModule } from "@/modules/redis/redis.module";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { UsersModule } from "@/modules/users/users.module";
import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";

@Module({
  imports: [PassportModule, RedisModule, ApiKeyModule, UsersModule, MembershipsModule, TokensModule],
  providers: [
    ApiKeyAuthStrategy,
    NextAuthGuard,
    NextAuthStrategy,
    AccessTokenGuard,
    AccessTokenStrategy,
    OAuthFlowService,
  ],
  exports: [NextAuthGuard, AccessTokenGuard],
})
export class AuthModule {}
