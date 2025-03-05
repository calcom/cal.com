import { API_VERSIONS_VALUES } from "@/lib/api-versions";
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
import { OrganizationsConferencingService } from "@/modules/organizations/conferencing/services/organizations-conferencing.service";
import { TokensRepository } from "@/modules/tokens/tokens.repository";
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
  BadRequestException,
  Delete,
  Headers,
  Redirect,
  UnauthorizedException,
  Req,
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
  path: "/v2/conferencing",
  version: API_VERSIONS_VALUES,
})
@DocsTags("Conferencing")
export class ConferencingController {
  constructor(
    private readonly tokensRepository: TokensRepository,
    private readonly conferencingService: ConferencingService,
    private readonly organizationsConferencingService: OrganizationsConferencingService
  ) {}

  @Post("/:app/connect")
  @HttpCode(HttpStatus.OK)
  @UseGuards(ApiAuthGuard)
  @ApiOperation({ summary: "Connect your conferencing application" })
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
  @ApiOperation({ summary: "Get OAuth conferencing app auth url" })
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

  @Get("/:app/oauth/callback")
  @UseGuards()
  @Redirect(undefined, 301)
  @ApiOperation({ summary: "conferencing apps oauths callback" })
  async save(
    @Query("state") state: string,
    @Param("app") app: string,
    @Query("code") code: string,
    @Query("error") error: string | undefined,
    @Query("error_description") error_description: string | undefined
  ): Promise<{ url: string }> {
    const decodedCallbackState: OAuthCallbackState = JSON.parse(state);
    try {
      const userId = await this.tokensRepository.getAccessTokenOwnerId(decodedCallbackState.accessToken);
      if (error) {
        throw new BadRequestException(error_description);
      }
      if (!userId) {
        throw new UnauthorizedException("Invalid Access token.");
      }
      if (decodedCallbackState.orgId) {
        return this.organizationsConferencingService.connectTeamOauthApps({
          app,
          code,
          userId,
          decodedCallbackState,
        });
      } else {
        return this.conferencingService.connectOauthApps(app, code, userId, decodedCallbackState);
      }
    } catch (error) {
      return {
        url: decodedCallbackState.onErrorReturnTo ?? "",
      };
    }
  }

  @Get("/")
  @HttpCode(HttpStatus.OK)
  @UseGuards(ApiAuthGuard)
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
  @ApiOperation({ summary: "Set your default conferencing application" })
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
  @ApiOperation({ summary: "Get your default conferencing application" })
  async getDefault(@GetUser() user: UserWithProfile): Promise<GetDefaultConferencingAppOutputResponseDto> {
    const defaultconferencingApp = await this.conferencingService.getUserDefaultConferencingApp(user.id);
    return { status: SUCCESS_STATUS, data: defaultconferencingApp };
  }

  @Delete("/:app/disconnect")
  @HttpCode(HttpStatus.OK)
  @UseGuards(ApiAuthGuard)
  @ApiOperation({ summary: "Disconnect your conferencing application" })
  async disconnect(
    @GetUser() user: UserWithProfile,
    @Param("app") app: string
  ): Promise<DisconnectConferencingAppOutputResponseDto> {
    await this.conferencingService.disconnectConferencingApp(user, app);
    return { status: SUCCESS_STATUS };
  }
}
