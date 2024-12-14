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
import { GoogleMeetService } from "@/modules/conferencing/services/google-meet.service";
import { ZoomVideoService } from "@/modules/conferencing/services/zoom-video.service";
import { TokensRepository } from "@/modules/tokens/tokens.repository";
import { UserWithProfile } from "@/modules/users/users.repository";
import {
  Controller,
  Get,
  Query,
  HttpCode,
  HttpStatus,
  Logger,
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

import { GOOGLE_MEET, ZOOM, SUCCESS_STATUS } from "@calcom/platform-constants";

export type OAuthCallbackState = {
  accessToken: string;
  teamId?: number;
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
  private readonly logger = new Logger("Platform Gcal Provider");

  constructor(
    private readonly tokensRepository: TokensRepository,
    private readonly conferencingService: ConferencingService,
    private readonly googleMeetService: GoogleMeetService,
    private readonly zoomVideoService: ZoomVideoService
  ) {}

  @Post("/:app/connect")
  @HttpCode(HttpStatus.OK)
  @UseGuards(ApiAuthGuard)
  @ApiOperation({ summary: "Connect your conferencing application" })
  async connect(
    @GetUser("id") userId: number,
    @Param("app") app: string
  ): Promise<ConferencingAppOutputResponseDto> {
    switch (app) {
      case GOOGLE_MEET:
        const credential = await this.googleMeetService.connectGoogleMeetApp(userId);

        return { status: SUCCESS_STATUS, data: plainToInstance(ConferencingAppsOutputDto, credential) };

      default:
        throw new BadRequestException(
          "Invalid conferencing app, available apps are: ",
          [GOOGLE_MEET].join(", ")
        );
    }
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
    let credential;
    const origin = req.headers.origin;
    const accessToken = authorization.replace("Bearer ", "");

    const state: OAuthCallbackState = {
      returnTo: returnTo ?? origin,
      onErrorReturnTo: onErrorReturnTo ?? origin,
      fromApp: false,
      accessToken,
    };

    switch (app) {
      case ZOOM:
        credential = await this.zoomVideoService.generateZoomAuthUrl(JSON.stringify(state));
        return {
          status: SUCCESS_STATUS,
          data: plainToInstance(ConferencingAppsOauthUrlOutputDto, credential),
        };

      default:
        throw new BadRequestException("Invalid conferencing app, available apps are: ", [ZOOM].join(", "));
    }
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

      switch (app) {
        case ZOOM:
          return await this.zoomVideoService.connectZoomApp(decodedCallbackState, code, userId);

        default:
          throw new BadRequestException("Invalid conferencing app, available apps are: ", [ZOOM].join(", "));
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
    @GetUser("id") userId: number
  ): Promise<ConferencingAppsOutputResponseDto> {
    const conferencingApps = await this.conferencingService.getConferencingApps(userId);

    const data = conferencingApps.map((conferencingApps) =>
      plainToInstance(ConferencingAppsOutputDto, conferencingApps)
    );

    return { status: SUCCESS_STATUS, data };
  }

  @Post("/:app/default")
  @HttpCode(HttpStatus.OK)
  @UseGuards(ApiAuthGuard)
  @ApiOperation({ summary: "Set your default conferencing application" })
  async default(
    @GetUser("id") userId: number,
    @Param("app") app: string
  ): Promise<SetDefaultConferencingAppOutputResponseDto> {
    await this.conferencingService.setDefaultConferencingApp(userId, app);
    return { status: SUCCESS_STATUS };
  }

  @Get("/default")
  @HttpCode(HttpStatus.OK)
  @UseGuards(ApiAuthGuard)
  @ApiOperation({ summary: "Get your default conferencing application" })
  async getDefault(@GetUser("id") userId: number): Promise<GetDefaultConferencingAppOutputResponseDto> {
    const defaultconferencingApp = await this.conferencingService.getUserDefaultConferencingApp(userId);
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
