import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { PlatformPlan } from "@/modules/auth/decorators/billing/platform-plan.decorator";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { Roles } from "@/modules/auth/decorators/roles/roles.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { PlatformPlanGuard } from "@/modules/auth/guards/billing/platform-plan.guard";
import { IsAdminAPIEnabledGuard } from "@/modules/auth/guards/organizations/is-admin-api-enabled.guard";
import { IsOrgGuard } from "@/modules/auth/guards/organizations/is-org.guard";
import { RolesGuard } from "@/modules/auth/guards/roles/roles.guard";
import { IsTeamInOrg } from "@/modules/auth/guards/teams/is-team-in-org.guard";
import { OrganizationsStripeService } from "@/modules/organizations/stripe/services/organizations-stripe.service";
import {
  StripConnectOutputDto,
  StripConnectOutputResponseDto,
  StripCredentialsCheckOutputResponseDto,
} from "@/modules/stripe/outputs/stripe.output";
import { StripeService } from "@/modules/stripe/stripe.service";
import { UserWithProfile } from "@/modules/users/users.repository";
import {
  Controller,
  Get,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Param,
  Headers,
  Req,
  ParseIntPipe,
} from "@nestjs/common";
import { ApiOperation, ApiTags as DocsTags } from "@nestjs/swagger";
import { plainToClass } from "class-transformer";
import { Request } from "express";

import { SUCCESS_STATUS } from "@calcom/platform-constants";

export type OAuthCallbackState = {
  accessToken: string;
  teamId?: string;
  orgId?: string;
  fromApp?: boolean;
  returnTo?: string;
  onErrorReturnTo?: string;
};

@Controller({
  path: "/v2/organizations/:orgId/teams/:teamId/stripe",
  version: API_VERSIONS_VALUES,
})
@DocsTags("Organizations/Teams Stripe")
export class OrganizationsStripeController {
  constructor(
    private readonly stripeService: StripeService,
    private readonly organizationsStripeService: OrganizationsStripeService
  ) {}

  @Roles("TEAM_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @UseGuards(ApiAuthGuard, IsOrgGuard, RolesGuard, IsTeamInOrg, PlatformPlanGuard, IsAdminAPIEnabledGuard)
  @Get("/connect")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get stripe connect URL for a team" })
  async getTeamStripeConnectUrl(
    @Req() req: Request,
    @Headers("Authorization") authorization: string,
    @GetUser() user: UserWithProfile,
    @Param("teamId") teamId: string,
    @Param("orgId") orgId: string,
    @Query("returnTo") returnTo?: string,
    @Query("onErrorReturnTo") onErrorReturnTo?: string
  ): Promise<StripConnectOutputResponseDto> {
    const origin = req.headers.origin;
    const accessToken = authorization.replace("Bearer ", "");

    const state: OAuthCallbackState = {
      onErrorReturnTo: !!onErrorReturnTo ? onErrorReturnTo : origin,
      fromApp: false,
      returnTo: !!returnTo ? returnTo : origin,
      accessToken,
      teamId,
      orgId,
    };

    const stripeRedirectUrl = await this.organizationsStripeService.getStripeTeamRedirectUrl({
      state,
      userEmail: user.email,
      userName: user.name,
    });

    return {
      status: SUCCESS_STATUS,
      data: plainToClass(StripConnectOutputDto, { authUrl: stripeRedirectUrl }, { strategy: "excludeAll" }),
    };
  }

  @Roles("TEAM_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @UseGuards(ApiAuthGuard, IsOrgGuard, RolesGuard, IsTeamInOrg, PlatformPlanGuard, IsAdminAPIEnabledGuard)
  @Get("/check")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Check team stripe connection" })
  async checkTeamStripeConnection(
    @Param("teamId", ParseIntPipe) teamId: number
  ): Promise<StripCredentialsCheckOutputResponseDto> {
    return await this.organizationsStripeService.checkIfTeamStripeAccountConnected(teamId);
  }
}
