import { CAL_VIDEO, CONFERENCING_APPS, GOOGLE_MEET } from "@calcom/platform-constants";
import { teamMetadataSchema } from "@calcom/platform-libraries";
import { handleDeleteCredential } from "@calcom/platform-libraries/app-store";
import { BadRequestException, Injectable, InternalServerErrorException, Logger } from "@nestjs/common";
import { OAuthCallbackState } from "@/modules/conferencing/controllers/conferencing.controller";
import { DefaultConferencingAppsOutputDto } from "@/modules/conferencing/outputs/get-default-conferencing-app.output";
import { ConferencingRepository } from "@/modules/conferencing/repositories/conferencing.repository";
import { ConferencingService } from "@/modules/conferencing/services/conferencing.service";
import { GoogleMeetService } from "@/modules/conferencing/services/google-meet.service";
import { TeamsRepository } from "@/modules/teams/teams/teams.repository";
import { UsersRepository, UserWithProfile } from "@/modules/users/users.repository";

@Injectable()
export class OrganizationsConferencingService {
  private logger = new Logger("OrganizationsConferencingService");

  constructor(
    private readonly conferencingRepository: ConferencingRepository,
    private teamsRepository: TeamsRepository,
    private usersRepository: UsersRepository,
    private readonly googleMeetService: GoogleMeetService,
    private readonly conferencingService: ConferencingService
  ) {}

  async connectTeamNonOauthApps({ teamId, app }: { teamId: number; app: string }): Promise<any> {
    switch (app) {
      case GOOGLE_MEET:
        return this.googleMeetService.connectGoogleMeetToTeam(teamId);
      default:
        throw new BadRequestException("Invalid conferencing app. Available apps: GOOGLE_MEET.");
    }
  }

  async connectTeamOauthApps({
    decodedCallbackState,
    app,
    code,
    teamId,
  }: {
    app: string;
    decodedCallbackState: OAuthCallbackState;
    code: string;
    teamId: number;
  }) {
    return this.conferencingService.connectOauthApps(app, code, decodedCallbackState, teamId);
  }

  async getConferencingApps({ teamId }: { teamId: number }) {
    return this.conferencingRepository.findTeamConferencingApps(teamId);
  }

  async getDefaultConferencingApp({
    teamId,
  }: {
    teamId: number;
  }): Promise<DefaultConferencingAppsOutputDto | undefined> {
    const team = await this.teamsRepository.getById(teamId);
    return teamMetadataSchema.parse(team?.metadata)?.defaultConferencingApp;
  }

  async checkAppIsValidAndConnected(teamId: number, app: string) {
    if (!CONFERENCING_APPS.includes(app)) {
      throw new BadRequestException("Invalid app, available apps are: ", CONFERENCING_APPS.join(", "));
    }
    const credential = await this.conferencingRepository.findTeamConferencingApp(teamId, app);

    if (!credential) {
      throw new BadRequestException(`${app} not connected.`);
    }
    return credential;
  }

  async disconnectConferencingApp({
    teamId,
    user,
    app,
  }: {
    teamId: number;
    user: UserWithProfile;
    app: string;
  }) {
    const credential = await this.checkAppIsValidAndConnected(teamId, app);
    return handleDeleteCredential({
      userId: user.id,
      teamId,
      userMetadata: user?.metadata,
      credentialId: credential.id,
    });
  }

  async setDefaultConferencingApp({ teamId, app }: { teamId: number; app: string }) {
    // cal-video is global, so we can skip this check
    if (app !== CAL_VIDEO) {
      await this.checkAppIsValidAndConnected(teamId, app);
    }
    const team = await this.teamsRepository.setDefaultConferencingApp(teamId, app);
    const metadata = team.metadata as { defaultConferencingApp?: { appSlug?: string } };
    if (metadata?.defaultConferencingApp?.appSlug !== app) {
      throw new InternalServerErrorException(`Could not set ${app} as default conferencing app`);
    }
    return true;
  }
}
