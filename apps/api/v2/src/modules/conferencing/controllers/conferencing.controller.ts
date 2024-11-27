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
} from "@/modules/conferencing/outputs/get-conferencing-apps.output";
import { SetDefaultConferencingAppOutputResponseDto } from "@/modules/conferencing/outputs/set-default-conferencing-app.output";
import { ConferencingService } from "@/modules/conferencing/services/conferencing.service";
import { GoogleMeetService } from "@/modules/conferencing/services/google-meet.service";
import { ZoomVideoService } from "@/modules/conferencing/services/zoom-video.service";
import { TokensRepository } from "@/modules/tokens/tokens.repository";
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
  ParseIntPipe,
  Redirect,
  UnauthorizedException,
  Req,
} from "@nestjs/common";
import { ApiOperation, ApiTags as DocsTags } from "@nestjs/swagger";
import { plainToInstance } from "class-transformer";
import { Request } from "express";

import { CONFERENCING_APPS, GOOGLE_MEET, ZOOM, SUCCESS_STATUS } from "@calcom/platform-constants";
import { ERROR_STATUS } from "@calcom/platform-constants";

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
    let credential;
    switch (app) {
      case GOOGLE_MEET:
        credential = await this.googleMeetService.connectGoogleMeetApp(userId);

        return { status: SUCCESS_STATUS, data: plainToInstance(ConferencingAppsOutputDto, credential) };

      default:
        throw new BadRequestException(
          "Invalid conferencing app, available apps are: ",
          CONFERENCING_APPS.join(", ")
        );
    }
  }

  @Get("/:app/oauth/auth-url")
  @HttpCode(HttpStatus.OK)
  @UseGuards(ApiAuthGuard)
  @ApiOperation({ summary: "Get oauth conferencing app auth url" })
  async redirect(
    @Req() req: Request,
    @Headers("Authorization") authorization: string,
    @Param("app") app: string
    // @Query("teamId", new ParseIntPipe({ optional: true })) teamId?: number
  ): Promise<GetConferencingAppsOauthUrlResponseDto> {
    let credential;
    const origin = req.headers.origin;
    const accessToken = authorization.replace("Bearer ", "");

    const state: OAuthCallbackState = {
      onErrorReturnTo: origin,
      fromApp: false,
      returnTo: origin,
      accessToken,
      // teamId,
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
  ): Promise<GetConferencingAppsOauthUrlResponseDto> {
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
          const credential = await this.zoomVideoService.connectZoomApp(decodedCallbackState, code, userId);

          return {
            status: SUCCESS_STATUS,
            data: plainToInstance(ConferencingAppsOauthUrlOutputDto, credential),
          };

        default:
          throw new BadRequestException("Invalid conferencing app, available apps are: ", [ZOOM].join(", "));
      }
    } catch (error) {
      return {
        data: { url: decodedCallbackState.onErrorReturnTo ?? "" },
        status: ERROR_STATUS,
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
    switch (app) {
      case GOOGLE_MEET:
        await this.googleMeetService.setDefault(userId);

        return { status: SUCCESS_STATUS };

      default:
        throw new BadRequestException(
          "Invalid conferencing app, available apps are: ",
          CONFERENCING_APPS.join(", ")
        );
    }
  }

  @Delete("/:app/disconnect")
  @HttpCode(HttpStatus.OK)
  @UseGuards(ApiAuthGuard)
  @ApiOperation({ summary: "Disconnect your conferencing application" })
  async disconnect(
    @GetUser("id") userId: number,
    @Param("app") app: string
  ): Promise<ConferencingAppOutputResponseDto> {
    switch (app) {
      case GOOGLE_MEET:
        const credential = await this.googleMeetService.disconnectGoogleMeetApp(userId);

        return { status: SUCCESS_STATUS, data: plainToInstance(ConferencingAppsOutputDto, credential) };

      default:
        throw new BadRequestException(
          "Invalid conferencing app, available apps are: ",
          CONFERENCING_APPS.join(", ")
        );
    }
  }
}
