import { ApiKeyModule } from "@/modules/api-key/api-key.module";
import { NextAuthGuard } from "@/modules/auth/guards";
import { AccessTokenGuard } from "@/modules/auth/guards/access-token/access-token.guard";
import { NextAuthStrategy } from "@/modules/auth/strategies";
import { AccessTokenStrategy } from "@/modules/auth/strategies/access-token/access-token.strategy";
import { ApiKeyAuthStrategy } from "@/modules/auth/strategies/api-key-auth/api-key-auth.strategy";
import { MembershipsModule } from "@/modules/memberships/memberships.module";
import { OAuthFlowService } from "@/modules/oauth-clients/services/oauth-flow.service";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { UsersModule } from "@/modules/users/users.module";
import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";

@Module({
  imports: [
    PassportModule,
    JwtModule.register({}),
    ApiKeyModule,
    UsersModule,
    MembershipsModule,
    TokensModule,
  ],
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
