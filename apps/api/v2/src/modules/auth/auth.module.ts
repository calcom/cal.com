import { ApiKeyModule } from "@/modules/api-key/api-key.module";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { PlatformPlanGuard } from "@/modules/auth/guards/billing/platform-plan.guard";
import { NextAuthGuard } from "@/modules/auth/guards/next-auth/next-auth.guard";
import { IsAdminAPIEnabledGuard } from "@/modules/auth/guards/organizations/is-admin-api-enabled.guard";
import { IsOrgGuard } from "@/modules/auth/guards/organizations/is-org.guard";
import { RolesGuard } from "@/modules/auth/guards/roles/roles.guard";
import { IsTeamInOrg } from "@/modules/auth/guards/teams/is-team-in-org.guard";
import { ApiAuthStrategy } from "@/modules/auth/strategies/api-auth/api-auth.strategy";
import { NextAuthStrategy } from "@/modules/auth/strategies/next-auth/next-auth.strategy";
import { DeploymentsModule } from "@/modules/deployments/deployments.module";
import { MembershipsModule } from "@/modules/memberships/memberships.module";
import { OAuthFlowService } from "@/modules/oauth-clients/services/oauth-flow.service";
import { OrganizationsModule } from "@/modules/organizations/organizations.module";
import { ProfilesModule } from "@/modules/profiles/profiles.module";
import { RedisModule } from "@/modules/redis/redis.module";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { UsersModule } from "@/modules/users/users.module";
import { forwardRef, Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";

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
    forwardRef(() => OrganizationsModule),
  ],
  providers: [
    NextAuthGuard,
    NextAuthStrategy,
    ApiAuthGuard,
    ApiAuthStrategy,
    OAuthFlowService,
    IsTeamInOrg,
    RolesGuard,
    IsOrgGuard,
    IsAdminAPIEnabledGuard,
    PlatformPlanGuard,
  ],
  exports: [
    NextAuthGuard,
    ApiAuthGuard,
    IsTeamInOrg,
    RolesGuard,
    IsOrgGuard,
    IsAdminAPIEnabledGuard,
    PlatformPlanGuard,
  ],
})
export class AuthModule {}
