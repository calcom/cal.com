import { NextAuthGuard } from "@/modules/auth/guards";
import { AccessTokenGuard } from "@/modules/auth/guards/access-token/access-token.guard";
import { NextAuthStrategy } from "@/modules/auth/strategies";
import { AccessTokenStrategy } from "@/modules/auth/strategies/access-token/access-token.strategy";
import { ApiKeyAuthStrategy } from "@/modules/auth/strategies/api-key-auth/api-key-auth.strategy";
import { OAuthFlowService } from "@/modules/endpoints/oauth-clients/services/oauth-flow.service";
import { MembershipsModule } from "@/modules/repositories/memberships/memberships.module";
import { TokensModule } from "@/modules/repositories/tokens/tokens.module";
import { UsersModule } from "@/modules/repositories/users/users.module";
import { ApiKeyModule } from "@/modules/services/api-key/api-key.module";
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
