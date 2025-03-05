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
import {
  ConferencingAppsOauthUrlOutputDto,
  GetConferencingAppsOauthUrlResponseDto,
} from "@/modules/conferencing/outputs/get-conferencing-apps-oauth-url";
import {
  ConferencingAppsOutputResponseDto,
  ConferencingAppOutputResponseDto,
  ConferencingAppsOutputDto,
  DisconnectConferencingAppOutputResponseDto,
} from "@/modules/conferencing/outputs/get-conferencing-apps.output";
import { GetDefaultConferencingAppOutputResponseDto } from "@/modules/conferencing/outputs/get-default-conferencing-app.output";
import { SetDefaultConferencingAppOutputResponseDto } from "@/modules/conferencing/outputs/set-default-conferencing-app.output";
import { ConferencingService } from "@/modules/conferencing/services/conferencing.service";
import { OrganizationsConferencingService } from "@/modules/organizations/conferencing/services/organizations-conferencing.service";
import { UserWithProfile } from "@/modules/users/users.repository";
import {
  Controller,
  Get,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Post,
  Param,
  Delete,
  Headers,
  Req,
  ParseIntPipe,
} from "@nestjs/common";
import { ApiOperation, ApiTags as DocsTags } from "@nestjs/swagger";
import { plainToInstance } from "class-transformer";
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
  path: "/v2/organizations/:orgId",
  version: API_VERSIONS_VALUES,
})
@DocsTags("Organizations/Teams Conferencing")
export class OrganizationsConferencingController {
  constructor(
    private readonly conferencingService: ConferencingService,
    private readonly organizationsConferencingService: OrganizationsConferencingService
  ) {}

  // Team-level endpoints
  @Roles("TEAM_ADMIN")
  @PlatformPlan("ESSENTIALS")
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
  @UseGuards(ApiAuthGuard, IsOrgGuard, RolesGuard, IsTeamInOrg, PlatformPlanGuard, IsAdminAPIEnabledGuard)
  @Get("/teams/:teamId/conferencing/:app/oauth/auth-url")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get OAuth conferencing app auth url for a team" })
  async getTeamOAuthUrl(
    @Req() req: Request,
    @Headers("Authorization") authorization: string,
    @Param("teamId") teamId: string,
    @Param("orgId") orgId: string,
    @Param("app") app: string,
    @Query("returnTo") returnTo?: string,
    @Query("onErrorReturnTo") onErrorReturnTo?: string
  ): Promise<GetConferencingAppsOauthUrlResponseDto> {
    const origin = req.headers.origin;
    const accessToken = authorization.replace("Bearer ", "");

    const state: OAuthCallbackState = {
      returnTo: returnTo ?? origin,
      onErrorReturnTo: onErrorReturnTo ?? origin,
      fromApp: false,
      accessToken,
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

  // Organization-level endpoints

  @Roles("ORG_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @UseGuards(ApiAuthGuard, IsOrgGuard, RolesGuard, PlatformPlanGuard, IsAdminAPIEnabledGuard)
  @Post("/conferencing/:app/connect")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Connect your conferencing application to an organization" })
  async connectOrgApp(
    @GetUser() user: UserWithProfile,
    @Param("orgId", ParseIntPipe) orgId: number,
    @Param("app") app: string
  ): Promise<ConferencingAppOutputResponseDto> {
    const credential = await this.organizationsConferencingService.connectTeamNonOauthApps({
      teamId: orgId,
      app,
    });

    return { status: SUCCESS_STATUS, data: plainToInstance(ConferencingAppsOutputDto, credential) };
  }

  @Roles("ORG_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @UseGuards(ApiAuthGuard, IsOrgGuard, RolesGuard, PlatformPlanGuard, IsAdminAPIEnabledGuard)
  @Get("/conferencing/:app/oauth/auth-url")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get OAuth conferencing app auth url for an organization" })
  async getOrgOAuthUrl(
    @Req() req: Request,
    @Headers("Authorization") authorization: string,
    @Param("orgId") orgId: string,
    @Param("app") app: string,
    @Query("returnTo") returnTo?: string,
    @Query("onErrorReturnTo") onErrorReturnTo?: string
  ): Promise<GetConferencingAppsOauthUrlResponseDto> {
    const origin = req.headers.origin;
    const accessToken = authorization.replace("Bearer ", "");

    const state: OAuthCallbackState = {
      returnTo: returnTo ?? origin,
      onErrorReturnTo: onErrorReturnTo ?? origin,
      fromApp: false,
      accessToken,
      orgId,
    };

    const credential = await this.conferencingService.generateOAuthUrl(app, state);

    return {
      status: SUCCESS_STATUS,
      data: plainToInstance(ConferencingAppsOauthUrlOutputDto, credential),
    };
  }

  @Roles("ORG_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @UseGuards(ApiAuthGuard, IsOrgGuard, RolesGuard, PlatformPlanGuard, IsAdminAPIEnabledGuard)
  @Get("/conferencing")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "List organization conferencing applications" })
  async listOrgConferencingApps(
    @Param("orgId", ParseIntPipe) orgId: number
  ): Promise<ConferencingAppsOutputResponseDto> {
    const conferencingApps = await this.organizationsConferencingService.getConferencingApps({
      teamId: orgId,
    });

    return {
      status: SUCCESS_STATUS,
      data: conferencingApps.map((app) => plainToInstance(ConferencingAppsOutputDto, app)),
    };
  }

  @Roles("ORG_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @UseGuards(ApiAuthGuard, IsOrgGuard, RolesGuard, PlatformPlanGuard, IsAdminAPIEnabledGuard)
  @Post("/conferencing/:app/default")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Set organization default conferencing application" })
  async setOrgDefaultApp(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Param("app") app: string
  ): Promise<SetDefaultConferencingAppOutputResponseDto> {
    await this.organizationsConferencingService.setDefaultConferencingApp({
      teamId: orgId,
      app,
    });

    return { status: SUCCESS_STATUS };
  }

  @Roles("ORG_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @UseGuards(ApiAuthGuard, IsOrgGuard, RolesGuard, PlatformPlanGuard, IsAdminAPIEnabledGuard)
  @Get("/conferencing/default")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get organization default conferencing application" })
  async getOrgDefaultApp(
    @GetUser() user: UserWithProfile,
    @Param("orgId", ParseIntPipe) orgId: number
  ): Promise<GetDefaultConferencingAppOutputResponseDto> {
    const defaultConferencingApp = await this.organizationsConferencingService.getDefaultConferencingApp({
      teamId: orgId,
    });

    return { status: SUCCESS_STATUS, data: defaultConferencingApp };
  }

  @Roles("ORG_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @UseGuards(ApiAuthGuard, IsOrgGuard, RolesGuard, PlatformPlanGuard, IsAdminAPIEnabledGuard)
  @Delete("/conferencing/:app/disconnect")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Disconnect organization conferencing application" })
  async disconnectOrgApp(
    @GetUser() user: UserWithProfile,
    @Param("orgId", ParseIntPipe) orgId: number,
    @Param("app") app: string
  ): Promise<DisconnectConferencingAppOutputResponseDto> {
    await this.organizationsConferencingService.disconnectConferencingApp({
      teamId: orgId,
      user,
      app,
    });

    return { status: SUCCESS_STATUS };
  }
}
