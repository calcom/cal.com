import { EventTypesModule } from "@/ee/event-types/event-types.module";
import { SchedulesModule } from "@/ee/schedules/schedules.module";
import { AuthModule } from "@/modules/auth/auth.module";
import { MembershipsModule } from "@/modules/memberships/memberships.module";
import { OAuthClientUsersController } from "@/modules/oauth-clients/controllers/oauth-client-users/oauth-client-users.controller";
import { OAuthClientsController } from "@/modules/oauth-clients/controllers/oauth-clients/oauth-clients.controller";
import { OAuthFlowController } from "@/modules/oauth-clients/controllers/oauth-flow/oauth-flow.controller";
import { OAuthClientCredentialsGuard } from "@/modules/oauth-clients/guards/oauth-client-credentials/oauth-client-credentials.guard";
import { OAuthClientRepository } from "@/modules/oauth-clients/oauth-client.repository";
import { OAuthClientUsersService } from "@/modules/oauth-clients/services/oauth-clients-users.service";
import { OAuthFlowService } from "@/modules/oauth-clients/services/oauth-flow.service";
import { OrganizationsModule } from "@/modules/organizations/organizations.module";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { RedisModule } from "@/modules/redis/redis.module";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { TokensRepository } from "@/modules/tokens/tokens.repository";
import { UsersModule } from "@/modules/users/users.module";
import { Global, Module } from "@nestjs/common";

@Global()
@Module({
  imports: [
    PrismaModule,
    RedisModule,
    AuthModule,
    UsersModule,
    TokensModule,
    MembershipsModule,
    EventTypesModule,
    OrganizationsModule,
    SchedulesModule,
  ],
  providers: [
    OAuthClientRepository,
    OAuthClientCredentialsGuard,
    TokensRepository,
    OAuthFlowService,
    OAuthClientUsersService,
  ],
  controllers: [OAuthClientUsersController, OAuthClientsController, OAuthFlowController],
  exports: [OAuthClientRepository, OAuthClientCredentialsGuard],
})
export class OAuthClientModule {}
