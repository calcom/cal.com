import { SUCCESS_STATUS, X_CAL_CLIENT_ID } from "@calcom/platform-constants";
import {
  BadRequestException,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Query,
  Redirect,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { ApiHeader, ApiOperation, ApiTags as DocsTags } from "@nestjs/swagger";
import { plainToClass } from "class-transformer";
import type { Request } from "express";
import { stringify } from "querystring";
import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import {
  OPTIONAL_API_KEY_OR_ACCESS_TOKEN_HEADER,
  OPTIONAL_X_CAL_CLIENT_ID_HEADER,
  OPTIONAL_X_CAL_SECRET_KEY_HEADER,
} from "@/lib/docs/headers";
import { PlatformPlan } from "@/modules/auth/decorators/billing/platform-plan.decorator";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { Roles } from "@/modules/auth/decorators/roles/roles.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { PlatformPlanGuard } from "@/modules/auth/guards/billing/platform-plan.guard";
import { IsAdminAPIEnabledGuard } from "@/modules/auth/guards/organizations/is-admin-api-enabled.guard";
import { IsOrgGuard } from "@/modules/auth/guards/organizations/is-org.guard";
import { RolesGuard } from "@/modules/auth/guards/roles/roles.guard";
import { IsTeamInOrg } from "@/modules/auth/guards/teams/is-team-in-org.guard";
import type { MembershipsRepository } from "@/modules/memberships/memberships.repository";
import type { OAuthClientRepository } from "@/modules/oauth-clients/oauth-client.repository";
import type { OrganizationsStripeService } from "@/modules/organizations/stripe/services/organizations-stripe.service";
import {
  StripConnectOutputDto,
  type StripConnectOutputResponseDto,
  type StripCredentialsCheckOutputResponseDto,
  type StripCredentialsSaveOutputResponseDto,
} from "@/modules/stripe/outputs/stripe.output";
import type { OAuthCallbackState } from "@/modules/stripe/stripe.service";
import { getOnErrorReturnToValueFromQueryState } from "@/modules/stripe/utils/getReturnToValueFromQueryState";
import type { TokensRepository } from "@/modules/tokens/tokens.repository";
import type { UserWithProfile } from "@/modules/users/users.repository";

@Controller({
  path: "/v2/organizations/:orgId/teams/:teamId/stripe",
  version: API_VERSIONS_VALUES,
})
@DocsTags("Orgs / Teams / Stripe")
@ApiHeader(OPTIONAL_X_CAL_CLIENT_ID_HEADER)
@ApiHeader(OPTIONAL_X_CAL_SECRET_KEY_HEADER)
@ApiHeader(OPTIONAL_API_KEY_OR_ACCESS_TOKEN_HEADER)
export class OrganizationsStripeController {
  constructor(
    private readonly organizationsStripeService: OrganizationsStripeService,
    private readonly tokensRepository: TokensRepository,
    private readonly oAuthClientRepository: OAuthClientRepository,
    private readonly membershipsRepository: MembershipsRepository
  ) {}

  @Roles("TEAM_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @UseGuards(ApiAuthGuard, IsOrgGuard, RolesGuard, IsTeamInOrg, PlatformPlanGuard, IsAdminAPIEnabledGuard)
  @Get("/connect")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get Stripe connect URL for a team" })
  async getTeamStripeConnectUrl(
    @Req() req: Request,
    @Headers("Authorization") authorization: string | undefined,
    @GetUser() user: UserWithProfile,
    @Param("teamId") teamId: string,
    @Param("orgId") orgId: string,
    @Query("returnTo") returnTo?: string,
    @Query("onErrorReturnTo") onErrorReturnTo?: string
  ): Promise<StripConnectOutputResponseDto> {
    const origin = req.headers.origin;
    const oAuthClientId = req.get(X_CAL_CLIENT_ID);

    // Determine if using OAuth client credentials or Bearer token
    const accessToken = authorization ? authorization.replace("Bearer ", "") : undefined;

    const state: OAuthCallbackState = {
      onErrorReturnTo: onErrorReturnTo ?? origin,
      fromApp: false,
      returnTo: returnTo ?? origin,
      // Store either access token or OAuth client ID for callback authentication
      accessToken,
      oAuthClientId: !accessToken ? oAuthClientId : undefined,
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
  @ApiOperation({ summary: "Check team Stripe connection" })
  async checkTeamStripeConnection(
    @Param("teamId", ParseIntPipe) teamId: number
  ): Promise<StripCredentialsCheckOutputResponseDto> {
    return await this.organizationsStripeService.checkIfTeamStripeAccountConnected(teamId);
  }

  @Roles("TEAM_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @UseGuards(ApiAuthGuard, IsOrgGuard, RolesGuard, IsTeamInOrg, PlatformPlanGuard, IsAdminAPIEnabledGuard)
  @Get("/save")
  @Redirect(undefined, 301)
  @ApiOperation({ summary: "Save Stripe credentials" })
  async save(
    @Query("state") state: string,
    @Query("code") code: string,
    @Query("error") error: string | undefined,
    @Query("error_description") error_description: string | undefined,
    @Param("teamId", ParseIntPipe) teamId: number
  ): Promise<StripCredentialsSaveOutputResponseDto> {
    if (!state) {
      throw new BadRequestException("Missing `state` query param");
    }

    const decodedCallbackState: OAuthCallbackState = JSON.parse(state);
    try {
      // user cancels flow
      if (error === "access_denied") {
        return { url: getOnErrorReturnToValueFromQueryState(state) };
      }

      if (error) {
        throw new BadRequestException(stringify({ error, error_description }));
      }

      // Determine user ID based on authentication method stored in state
      let userId: number | undefined;

      if (decodedCallbackState.accessToken) {
        // Standard flow: get user from access token
        userId = await this.tokensRepository.getAccessTokenOwnerId(decodedCallbackState.accessToken);
      } else if (decodedCallbackState.oAuthClientId) {
        // OAuth client credentials flow: get platform owner/admin from OAuth client
        const oAuthClient = await this.oAuthClientRepository.getOAuthClient(decodedCallbackState.oAuthClientId);
        if (!oAuthClient) {
          throw new UnauthorizedException("Invalid OAuth client ID in callback state");
        }

        userId =
          (await this.membershipsRepository.findPlatformOwnerUserId(oAuthClient.organizationId)) ||
          (await this.membershipsRepository.findPlatformAdminUserId(oAuthClient.organizationId));
      }

      if (!userId) {
        throw new UnauthorizedException("Unable to determine user for Stripe account setup");
      }

      return await this.organizationsStripeService.saveStripeAccount(
        decodedCallbackState,
        code,
        teamId,
        userId
      );
    } catch (err) {
      if (err instanceof Error) {
        console.error(err.message);
      }
      return {
        url: decodedCallbackState.onErrorReturnTo ?? "",
      };
    }
  }
}
