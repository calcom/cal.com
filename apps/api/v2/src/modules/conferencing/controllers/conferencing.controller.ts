import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { API_KEY_OR_ACCESS_TOKEN_HEADER } from "@/lib/docs/headers";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
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
import { UserWithProfile } from "@/modules/users/users.repository";
import { HttpService } from "@nestjs/axios";
import { Logger } from "@nestjs/common";
import {
  Controller,
  Get,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Post,
  Param,
  BadRequestException,
  Delete,
  Headers,
  Redirect,
  Req,
  HttpException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiHeader, ApiOperation, ApiParam, ApiTags as DocsTags } from "@nestjs/swagger";
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
  path: "/v2/conferencing",
  version: API_VERSIONS_VALUES,
})
@DocsTags("Conferencing")
export class ConferencingController {
  private readonly logger = new Logger("ConferencingController");

  constructor(
    private readonly conferencingService: ConferencingService,
    private readonly config: ConfigService,
    private readonly httpService: HttpService
  ) {}

  @Post("/:app/connect")
  @HttpCode(HttpStatus.OK)
  @UseGuards(ApiAuthGuard)
  @ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
  @ApiOperation({ summary: "Connect your conferencing application" })
  @ApiParam({
    name: "app",
    description: "Conferencing application type",
    enum: [GOOGLE_MEET],
    required: true,
  })
  async connect(
    @GetUser() user: UserWithProfile,
    @Param("app") app: string
  ): Promise<ConferencingAppOutputResponseDto> {
    const credential = await this.conferencingService.connectUserNonOauthApp(app, user.id);
    return { status: SUCCESS_STATUS, data: plainToInstance(ConferencingAppsOutputDto, credential) };
  }

  @Get("/:app/oauth/auth-url")
  @HttpCode(HttpStatus.OK)
  @UseGuards(ApiAuthGuard)
  @ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
  @ApiOperation({ summary: "Get OAuth conferencing app auth url" })
  @ApiParam({
    name: "app",
    description: "Conferencing application type",
    enum: [ZOOM, OFFICE_365_VIDEO],
    required: true,
  })
  async redirect(
    @Req() req: Request,
    @Headers("Authorization") authorization: string,
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
    };

    const credential = await this.conferencingService.generateOAuthUrl(app, state);

    return {
      status: SUCCESS_STATUS,
      data: plainToInstance(ConferencingAppsOauthUrlOutputDto, credential),
    };
  }

  /**
   * Handles saving conferencing app credentials.
   * If both orgId and teamId are present in the callback state, the request is proxied to the organization/team-level endpoint;
   * otherwise, credentials are saved at the user level.
   *
   * Proxying ensures that permission checks—such as whether the user is allowed to install conferencing app for a team or organization—
   * are enforced via controller route guards, avoiding duplication of this logic within the service layer.
   */
  @Get("/:app/oauth/callback")
  @UseGuards()
  @Redirect(undefined, 301)
  @ApiOperation({ summary: "conferencing apps oauths callback" })
  @ApiParam({
    name: "app",
    description: "Conferencing application type",
    enum: [ZOOM, OFFICE_365_VIDEO],
    required: true,
  })
  async save(
    @Query("state") state: string,
    @Param("app") app: string,
    @Query("code") code: string,
    @Query("error") error: string | undefined,
    @Query("error_description") error_description: string | undefined
  ): Promise<{ url: string }> {
    if (!state) {
      throw new BadRequestException("Missing `state` query param");
    }

    const decodedCallbackState: OAuthCallbackState = JSON.parse(state);
    try {
      if (error) {
        throw new BadRequestException(error_description);
      }

      if (decodedCallbackState.teamId && decodedCallbackState.orgId) {
        const apiUrl = this.config.get("api.url");
        const url = `${apiUrl}/organizations/${decodedCallbackState.orgId}/teams/${decodedCallbackState.teamId}/conferencing/${app}/oauth/callback`;
        const params: Record<string, string | undefined> = { state, code, error, error_description };
        const headers = {
          Authorization: `Bearer ${decodedCallbackState.accessToken}`,
        };
        try {
          const response = await this.httpService.axiosRef.get(url, { params, headers });
          const redirectUrl = response.data?.url || decodedCallbackState.onErrorReturnTo || "";
          return { url: redirectUrl };
        } catch (err) {
          const fallbackUrl = decodedCallbackState.onErrorReturnTo || "";
          return { url: fallbackUrl };
        }
      }

      return this.conferencingService.connectOauthApps(app, code, decodedCallbackState);
    } catch (error) {
      if (error instanceof HttpException || error instanceof Error) {
        this.logger.error(error.message);
      }
      return {
        url: decodedCallbackState.onErrorReturnTo ?? "",
      };
    }
  }

  @Get("/")
  @HttpCode(HttpStatus.OK)
  @UseGuards(ApiAuthGuard)
  @ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
  @ApiOperation({ summary: "List your conferencing applications" })
  async listInstalledConferencingApps(
    @GetUser() user: UserWithProfile
  ): Promise<ConferencingAppsOutputResponseDto> {
    const conferencingApps = await this.conferencingService.getConferencingApps(user.id);
    return {
      status: SUCCESS_STATUS,
      data: conferencingApps.map((app) => plainToInstance(ConferencingAppsOutputDto, app)),
    };
  }

  @Post("/:app/default")
  @HttpCode(HttpStatus.OK)
  @UseGuards(ApiAuthGuard)
  @ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
  @ApiOperation({ summary: "Set your default conferencing application" })
  @ApiParam({
    name: "app",
    description: "Conferencing application type",
    enum: [GOOGLE_MEET, ZOOM, OFFICE_365_VIDEO, CAL_VIDEO],
    required: true,
  })
  async default(
    @GetUser() user: UserWithProfile,
    @Param("app") app: string
  ): Promise<SetDefaultConferencingAppOutputResponseDto> {
    await this.conferencingService.setDefaultConferencingApp(user, app);
    return { status: SUCCESS_STATUS };
  }

  @Get("/default")
  @HttpCode(HttpStatus.OK)
  @UseGuards(ApiAuthGuard)
  @ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
  @ApiOperation({ summary: "Get your default conferencing application" })
  async getDefault(@GetUser() user: UserWithProfile): Promise<GetDefaultConferencingAppOutputResponseDto> {
    const defaultconferencingApp = await this.conferencingService.getUserDefaultConferencingApp(user.id);
    return { status: SUCCESS_STATUS, data: defaultconferencingApp };
  }

  @Delete("/:app/disconnect")
  @HttpCode(HttpStatus.OK)
  @UseGuards(ApiAuthGuard)
  @ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
  @ApiOperation({ summary: "Disconnect your conferencing application" })
  @ApiParam({
    name: "app",
    description: "Conferencing application type",
    enum: [GOOGLE_MEET, ZOOM, OFFICE_365_VIDEO],
    required: true,
  })
  async disconnect(
    @GetUser() user: UserWithProfile,
    @Param("app") app: string
  ): Promise<DisconnectConferencingAppOutputResponseDto> {
    await this.conferencingService.disconnectConferencingApp(user, app);
    return { status: SUCCESS_STATUS };
  }
}
