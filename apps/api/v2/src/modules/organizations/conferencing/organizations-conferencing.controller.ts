import { CAL_VIDEO, GOOGLE_MEET, OFFICE_365_VIDEO, SUCCESS_STATUS, X_CAL_CLIENT_ID, ZOOM } from "@calcom/platform-constants";
import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Redirect,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiHeader, ApiOperation, ApiParam, ApiTags as DocsTags } from "@nestjs/swagger";
import { plainToInstance } from "class-transformer";
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
import {
  type ConferencingAppOutputResponseDto,
  ConferencingAppsOutputDto,
  type ConferencingAppsOutputResponseDto,
  type DisconnectConferencingAppOutputResponseDto,
} from "@/modules/conferencing/outputs/get-conferencing-apps.output";
import {
  ConferencingAppsOauthUrlOutputDto,
  type GetConferencingAppsOauthUrlResponseDto,
} from "@/modules/conferencing/outputs/get-conferencing-apps-oauth-url";
import type { GetDefaultConferencingAppOutputResponseDto } from "@/modules/conferencing/outputs/get-default-conferencing-app.output";
import type { SetDefaultConferencingAppOutputResponseDto } from "@/modules/conferencing/outputs/set-default-conferencing-app.output";
import type { ConferencingService } from "@/modules/conferencing/services/conferencing.service";
import type { OrganizationsConferencingService } from "@/modules/organizations/conferencing/services/organizations-conferencing.service";
import type { TokensRepository } from "@/modules/tokens/tokens.repository";
import type { UserWithProfile } from "@/modules/users/users.repository";

export type OAuthCallbackState = {
  accessToken?: string;
  oAuthClientId?: string;
  teamId?: string;
  orgId?: string;
  fromApp?: boolean;
  returnTo?: string;
  onErrorReturnTo?: string;
};

@Controller({
  path: "/v2/organizations/:orgId",
  version: API_VERSIONS_VALUES,
})
@DocsTags("Orgs / Teams / Conferencing")
@ApiHeader(OPTIONAL_X_CAL_CLIENT_ID_HEADER)
@ApiHeader(OPTIONAL_X_CAL_SECRET_KEY_HEADER)
@ApiHeader(OPTIONAL_API_KEY_OR_ACCESS_TOKEN_HEADER)
export class OrganizationsConferencingController {
  constructor(
    private readonly conferencingService: ConferencingService,
    private readonly organizationsConferencingService: OrganizationsConferencingService,
    private readonly tokensRepository: TokensRepository
  ) {}

  @Roles("TEAM_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @ApiParam({
    name: "app",
    description: "Conferencing application type",
    enum: [GOOGLE_MEET],
    required: true,
  })
  @UseGuards(ApiAuthGuard, IsOrgGuard, RolesGuard, IsTeamInOrg, PlatformPlanGuard, IsAdminAPIEnabledGuard)
  @Post("/teams/:teamId/conferencing/:app/connect")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Connect your conferencing application to a team" })
  async connectTeamApp(
    @GetUser() user: UserWithProfile,
    @Param("teamId", ParseIntPipe) teamId: number,
    @Param("orgId", ParseIntPipe) orgId: number,
    @Param("app") app: string
  ): Promise<ConferencingAppOutputResponseDto> {
    const credential = await this.organizationsConferencingService.connectTeamNonOauthApps({
      teamId,
      app,
    });

    return { status: SUCCESS_STATUS, data: plainToInstance(ConferencingAppsOutputDto, credential) };
  }

  @Roles("TEAM_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @ApiParam({
    name: "app",
    description: "Conferencing application type",
    enum: [ZOOM, OFFICE_365_VIDEO],
    required: true,
  })
  @UseGuards(ApiAuthGuard, IsOrgGuard, RolesGuard, IsTeamInOrg, PlatformPlanGuard, IsAdminAPIEnabledGuard)
  @Get("/teams/:teamId/conferencing/:app/oauth/auth-url")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get OAuth conferencing app's auth URL for a team" })
  async getTeamOAuthUrl(
    @Req() req: Request,
    @Headers("Authorization") authorization: string | undefined,
    @Param("teamId") teamId: string,
    @Param("orgId") orgId: string,
    @Param("app") app: string,
    @Query("returnTo") returnTo?: string,
    @Query("onErrorReturnTo") onErrorReturnTo?: string
  ): Promise<GetConferencingAppsOauthUrlResponseDto> {
    const origin = req.headers.origin;
    const oAuthClientId = req.get(X_CAL_CLIENT_ID);

    // Determine if using OAuth client credentials or Bearer token
    const accessToken = authorization ? authorization.replace("Bearer ", "") : undefined;

    const state: OAuthCallbackState = {
      returnTo: returnTo ?? origin,
      onErrorReturnTo: onErrorReturnTo ?? origin,
      fromApp: false,
      // Store either access token or OAuth client ID for callback authentication
      accessToken,
      oAuthClientId: !accessToken ? oAuthClientId : undefined,
      teamId,
      orgId,
    };

    const credential = await this.conferencingService.generateOAuthUrl(app, state);

    return {
      status: SUCCESS_STATUS,
      data: plainToInstance(ConferencingAppsOauthUrlOutputDto, credential),
    };
  }

  @Roles("TEAM_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @UseGuards(ApiAuthGuard, IsOrgGuard, RolesGuard, IsTeamInOrg, PlatformPlanGuard, IsAdminAPIEnabledGuard)
  @Get("/teams/:teamId/conferencing")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "List team conferencing applications" })
  async listTeamConferencingApps(
    @Param("teamId", ParseIntPipe) teamId: number
  ): Promise<ConferencingAppsOutputResponseDto> {
    const conferencingApps = await this.organizationsConferencingService.getConferencingApps({
      teamId,
    });

    return {
      status: SUCCESS_STATUS,
      data: conferencingApps.map((app) => plainToInstance(ConferencingAppsOutputDto, app)),
    };
  }

  @Roles("TEAM_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @UseGuards(ApiAuthGuard, IsOrgGuard, RolesGuard, IsTeamInOrg, PlatformPlanGuard, IsAdminAPIEnabledGuard)
  @Post("/teams/:teamId/conferencing/:app/default")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Set team default conferencing application" })
  @ApiParam({
    name: "app",
    description: "Conferencing application type",
    enum: [GOOGLE_MEET, ZOOM, OFFICE_365_VIDEO, CAL_VIDEO],
    required: true,
  })
  async setTeamDefaultApp(
    @Param("teamId", ParseIntPipe) teamId: number,
    @Param("app") app: string
  ): Promise<SetDefaultConferencingAppOutputResponseDto> {
    await this.organizationsConferencingService.setDefaultConferencingApp({
      teamId,
      app,
    });

    return { status: SUCCESS_STATUS };
  }

  @Roles("TEAM_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @UseGuards(ApiAuthGuard, IsOrgGuard, RolesGuard, IsTeamInOrg, PlatformPlanGuard, IsAdminAPIEnabledGuard)
  @Get("/teams/:teamId/conferencing/default")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get team default conferencing application" })
  @ApiParam({
    name: "app",
    description: "Conferencing application type",
    enum: [GOOGLE_MEET, ZOOM, OFFICE_365_VIDEO, CAL_VIDEO],
    required: true,
  })
  async getTeamDefaultApp(
    @GetUser() user: UserWithProfile,
    @Param("teamId", ParseIntPipe) teamId: number
  ): Promise<GetDefaultConferencingAppOutputResponseDto> {
    const defaultConferencingApp = await this.organizationsConferencingService.getDefaultConferencingApp({
      teamId,
    });

    return { status: SUCCESS_STATUS, data: defaultConferencingApp };
  }

  @Roles("TEAM_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @UseGuards(ApiAuthGuard, IsOrgGuard, RolesGuard, IsTeamInOrg, PlatformPlanGuard, IsAdminAPIEnabledGuard)
  @Delete("/teams/:teamId/conferencing/:app/disconnect")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Disconnect team conferencing application" })
  @ApiParam({
    name: "app",
    description: "Conferencing application type",
    enum: [GOOGLE_MEET, ZOOM, OFFICE_365_VIDEO],
    required: true,
  })
  async disconnectTeamApp(
    @GetUser() user: UserWithProfile,
    @Param("teamId", ParseIntPipe) teamId: number,
    @Param("app") app: string
  ): Promise<DisconnectConferencingAppOutputResponseDto> {
    await this.organizationsConferencingService.disconnectConferencingApp({
      teamId,
      user,
      app,
    });

    return { status: SUCCESS_STATUS };
  }

  @Roles("TEAM_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @UseGuards(ApiAuthGuard, IsOrgGuard, RolesGuard, IsTeamInOrg, PlatformPlanGuard, IsAdminAPIEnabledGuard)
  @Get("/teams/:teamId/conferencing/:app/oauth/callback")
  @Redirect(undefined, 301)
  @ApiOperation({ summary: "Save conferencing app OAuth credentials" })
  async saveTeamOauthCredentials(
    @Query("state") state: string,
    @Query("code") code: string,
    @Query("error") error: string | undefined,
    @Query("error_description") error_description: string | undefined,
    @Param("teamId", ParseIntPipe) teamId: number,
    @Param("orgId", ParseIntPipe) orgId: number,
    @Param("app") app: string
  ): Promise<{ url: string }> {
    if (!state) {
      throw new BadRequestException("Missing `state` query param");
    }

    const decodedCallbackState: OAuthCallbackState = JSON.parse(state);
    try {
      return await this.organizationsConferencingService.connectTeamOauthApps({
        decodedCallbackState,
        code,
        app,
        teamId,
      });
    } catch (error) {
      if (error instanceof Error) {
        console.error(error.message);
      }
      return {
        url: decodedCallbackState.onErrorReturnTo ?? "",
      };
    }
  }
}
