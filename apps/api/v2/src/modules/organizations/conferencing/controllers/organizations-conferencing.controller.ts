import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { PlatformPlan } from "@/modules/auth/decorators/billing/platform-plan.decorator";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { Roles } from "@/modules/auth/decorators/roles/roles.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { PlatformPlanGuard } from "@/modules/auth/guards/billing/platform-plan.guard";
import { IsAdminAPIEnabledGuard } from "@/modules/auth/guards/organizations/is-admin-api-enabled.guard";
import { IsOrgGuard } from "@/modules/auth/guards/organizations/is-org.guard";
import { RolesGuard } from "@/modules/auth/guards/roles/roles.guard";
import {
  ConferencingAppsOauthUrlOutputDto,
  GetConferencingAppsOauthUrlResponseDto,
} from "@/modules/conferencing/outputs/get-conferencing-apps-oauth-url";
import {
  ConferencingAppsOutputResponseDto,
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
  BadRequestException,
  Redirect,
} from "@nestjs/common";
import { ApiOperation, ApiTags as DocsTags, ApiParam } from "@nestjs/swagger";
import { plainToInstance } from "class-transformer";
import { Request } from "express";

import { GOOGLE_MEET, ZOOM, SUCCESS_STATUS, OFFICE_365_VIDEO, CAL_VIDEO } from "@calcom/platform-constants";

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
@DocsTags("Organizations / Conferencing")
export class OrganizationsConferencingController {
  constructor(
    private readonly conferencingService: ConferencingService,
    private readonly organizationsConferencingService: OrganizationsConferencingService
  ) {}

  @Roles("ORG_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @ApiParam({
    name: "app",
    description: "Conferencing application type",
    enum: [ZOOM, OFFICE_365_VIDEO],
    required: true,
  })
  @UseGuards(ApiAuthGuard, IsOrgGuard, RolesGuard, PlatformPlanGuard, IsAdminAPIEnabledGuard)
  @Get("/conferencing/:app/oauth/auth-url")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get OAuth conferencing app's auth url for a organization" })
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
      data: conferencingApps.map((app) =>
        plainToInstance(ConferencingAppsOutputDto, app, { strategy: "excludeAll" })
      ),
    };
  }

  @Roles("ORG_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @UseGuards(ApiAuthGuard, IsOrgGuard, RolesGuard, PlatformPlanGuard, IsAdminAPIEnabledGuard)
  @Post("/conferencing/:app/default")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Set organization default conferencing application" })
  @ApiParam({
    name: "app",
    description: "Conferencing application type",
    enum: [GOOGLE_MEET, ZOOM, OFFICE_365_VIDEO, CAL_VIDEO],
    required: true,
  })
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
  @ApiParam({
    name: "app",
    description: "Conferencing application type",
    enum: [GOOGLE_MEET, ZOOM, OFFICE_365_VIDEO],
    required: true,
  })
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

  @Roles("ORG_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @UseGuards(ApiAuthGuard, IsOrgGuard, RolesGuard, PlatformPlanGuard, IsAdminAPIEnabledGuard)
  @Get("/conferencing/:app/oauth/callback")
  @Redirect(undefined, 301)
  @ApiOperation({ summary: "Save conferencing app OAuth credentials" })
  async handleOrgOauthCallback(
    @Query("state") state: string,
    @Query("code") code: string,
    @Query("error") error: string | undefined,
    @Query("error_description") error_description: string | undefined,
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
        teamId: orgId,
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
