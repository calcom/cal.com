import {
  CAL_VIDEO,
  CONFERENCING_APPS,
  GOOGLE_MEET,
  OFFICE_365_VIDEO,
  ZOOM,
} from "@calcom/platform-constants";
import { userMetadata } from "@calcom/platform-libraries";
import {
  getApps,
  getUsersCredentialsIncludeServiceAccountKey,
  handleDeleteCredential,
} from "@calcom/platform-libraries/app-store";
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import type { OAuthCallbackState } from "@/modules/conferencing/controllers/conferencing.controller";
import type { ConferencingRepository } from "@/modules/conferencing/repositories/conferencing.repository";
import type { GoogleMeetService } from "@/modules/conferencing/services/google-meet.service";
import type { Office365VideoService } from "@/modules/conferencing/services/office365-video.service";
import type { ZoomVideoService } from "@/modules/conferencing/services/zoom-video.service";
import type { MembershipsRepository } from "@/modules/memberships/memberships.repository";
import type { OAuthClientRepository } from "@/modules/oauth-clients/oauth-client.repository";
import type { TokensRepository } from "@/modules/tokens/tokens.repository";
import type { UsersRepository, UserWithProfile } from "@/modules/users/users.repository";

@Injectable()
export class ConferencingService {
  private logger = new Logger("ConferencingService");

  constructor(
    private readonly conferencingRepository: ConferencingRepository,
    private readonly usersRepository: UsersRepository,
    private readonly tokensRepository: TokensRepository,
    private readonly googleMeetService: GoogleMeetService,
    private readonly zoomVideoService: ZoomVideoService,
    private readonly office365VideoService: Office365VideoService,
    private readonly oAuthClientRepository: OAuthClientRepository,
    private readonly membershipsRepository: MembershipsRepository
  ) {}

  async getConferencingApps(userId: number) {
    return this.conferencingRepository.findConferencingApps(userId);
  }

  async connectUserNonOauthApp(app: string, userId: number) {
    switch (app) {
      case GOOGLE_MEET: {
        const credential = await this.googleMeetService.connectGoogleMeetToUser(userId);
        return credential;
      }
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
      throw new UnauthorizedException("Unable to determine user for conferencing app setup");
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
