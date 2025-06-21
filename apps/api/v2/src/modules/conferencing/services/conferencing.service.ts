import { OAuthCallbackState } from "@/modules/conferencing/controllers/conferencing.controller";
import { ConferencingRepository } from "@/modules/conferencing/repositories/conferencing.repository";
import { GoogleMeetService } from "@/modules/conferencing/services/google-meet.service";
import { Office365VideoService } from "@/modules/conferencing/services/office365-video.service";
import { ZoomVideoService } from "@/modules/conferencing/services/zoom-video.service";
import { TokensRepository } from "@/modules/tokens/tokens.repository";
import { UserWithProfile } from "@/modules/users/users.repository";
import { UsersRepository } from "@/modules/users/users.repository";
import {
  BadRequestException,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { Injectable } from "@nestjs/common";

import {
  CONFERENCING_APPS,
  CAL_VIDEO,
  GOOGLE_MEET,
  ZOOM,
  OFFICE_365_VIDEO,
} from "@calcom/platform-constants";
import { userMetadata } from "@calcom/platform-libraries";
import { getUsersCredentialsIncludeServiceAccountKey } from "@calcom/platform-libraries/app-store";
import { getApps, handleDeleteCredential } from "@calcom/platform-libraries/app-store";

@Injectable()
export class ConferencingService {
  private logger = new Logger("ConferencingService");

  constructor(
    private readonly conferencingRepository: ConferencingRepository,
    private readonly usersRepository: UsersRepository,
    private readonly tokensRepository: TokensRepository,
    private readonly googleMeetService: GoogleMeetService,
    private readonly zoomVideoService: ZoomVideoService,
    private readonly office365VideoService: Office365VideoService
  ) {}

  async getConferencingApps(userId: number) {
    return this.conferencingRepository.findConferencingApps(userId);
  }

  async connectUserNonOauthApp(app: string, userId: number) {
    switch (app) {
      case GOOGLE_MEET:
        const credential = await this.googleMeetService.connectGoogleMeetToUser(userId);
        return credential;
      default:
        throw new BadRequestException("Invalid conferencing app. Available apps: GOOGLE_MEET.");
    }
  }

  async connectOauthApps(
    app: string,
    code: string,
    decodedCallbackState: OAuthCallbackState,
    teamId?: number
  ) {
    const userId = await this.tokensRepository.getAccessTokenOwnerId(decodedCallbackState.accessToken);
    if (!userId) {
      throw new UnauthorizedException("Invalid Access token.");
    }
    switch (app) {
      case ZOOM:
        return await this.zoomVideoService.connectZoomApp(decodedCallbackState, code, userId, teamId);

      case OFFICE_365_VIDEO:
        return await this.office365VideoService.connectOffice365App(
          decodedCallbackState,
          code,
          userId,
          teamId
        );

      default:
        throw new BadRequestException(
          "Invalid conferencing app, available apps are: ",
          [ZOOM, OFFICE_365_VIDEO].join(", ")
        );
    }
  }

  async getUserDefaultConferencingApp(userId: number) {
    const user = await this.usersRepository.findById(userId);
    return userMetadata.parse(user?.metadata)?.defaultConferencingApp;
  }

  async checkAppIsValidAndConnected(user: UserWithProfile, appSlug: string) {
    if (!CONFERENCING_APPS.includes(appSlug)) {
      throw new BadRequestException("Invalid app, available apps are: ", CONFERENCING_APPS.join(", "));
    }
    const credentials = await getUsersCredentialsIncludeServiceAccountKey(user);

    const foundApp = getApps(credentials, true).filter((app) => app.slug === appSlug)[0];

    const appLocation = foundApp?.appData?.location;

    if (!foundApp || !appLocation) {
      throw new BadRequestException(`${appSlug} not connected.`);
    }
    return foundApp.credential;
  }

  async disconnectConferencingApp(user: UserWithProfile, app: string) {
    const credential = await this.checkAppIsValidAndConnected(user, app);
    return handleDeleteCredential({
      userId: user.id,
      userMetadata: user?.metadata,
      credentialId: credential.id,
    });
  }

  async setDefaultConferencingApp(user: UserWithProfile, app: string) {
    // cal-video is global, so we can skip this check
    if (app !== CAL_VIDEO) {
      await this.checkAppIsValidAndConnected(user, app);
    }
    const updatedUser = await this.usersRepository.setDefaultConferencingApp(user.id, app);
    const metadata = updatedUser.metadata as { defaultConferencingApp?: { appSlug?: string } };
    if (metadata?.defaultConferencingApp?.appSlug !== app) {
      throw new InternalServerErrorException(`Could not set ${app} as default conferencing app`);
    }
    return true;
  }

  async generateOAuthUrl(app: string, state: OAuthCallbackState) {
    switch (app) {
      case ZOOM:
        return await this.zoomVideoService.generateZoomAuthUrl(JSON.stringify(state));

      case OFFICE_365_VIDEO:
        return await this.office365VideoService.generateOffice365AuthUrl(JSON.stringify(state));

      default:
        throw new BadRequestException(
          "Invalid conferencing app, available apps are: ",
          [ZOOM, OFFICE_365_VIDEO].join(", ")
        );
    }
  }
}
