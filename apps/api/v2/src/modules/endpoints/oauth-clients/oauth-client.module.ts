import { getEnv } from "@/env";
import { AuthModule } from "@/modules/auth/auth.module";
import { OAuthClientUsersController } from "@/modules/endpoints/oauth-clients/controllers/oauth-client-users/oauth-client-users.controller";
import { OAuthClientsController } from "@/modules/endpoints/oauth-clients/controllers/oauth-clients/oauth-clients.controller";
import { OAuthFlowController } from "@/modules/endpoints/oauth-clients/controllers/oauth-flow/oauth-flow.controller";
import { OAuthClientCredentialsGuard } from "@/modules/endpoints/oauth-clients/guards/oauth-client-credentials/oauth-client-credentials.guard";
import { OAuthClientRepository } from "@/modules/endpoints/oauth-clients/oauth-client.repository";
import { OAuthFlowService } from "@/modules/endpoints/oauth-clients/services/oauth-flow.service";
import { MembershipsModule } from "@/modules/repositories/memberships/memberships.module";
import { TokensRepository } from "@/modules/repositories/tokens/tokens.repository";
import { UsersModule } from "@/modules/repositories/users/users.module";
import { PrismaModule } from "@/modules/services/prisma/prisma.module";
import { Global, Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";

@Global()
@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    MembershipsModule,
    JwtModule.register({ secret: getEnv("JWT_SECRET") }),
  ],
  providers: [OAuthClientRepository, OAuthClientCredentialsGuard, TokensRepository, OAuthFlowService],
  controllers: [OAuthClientsController, OAuthClientUsersController, OAuthFlowController],
  exports: [OAuthClientRepository, OAuthClientCredentialsGuard],
})
export class OAuthClientModule {}
