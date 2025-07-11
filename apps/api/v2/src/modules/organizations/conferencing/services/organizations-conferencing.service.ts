import { OAuthCallbackState } from "@/modules/conferencing/controllers/conferencing.controller";
import { DefaultConferencingAppsOutputDto } from "@/modules/conferencing/outputs/get-default-conferencing-app.output";
import { ConferencingRepository } from "@/modules/conferencing/repositories/conferencing.repository";
import { ConferencingService } from "@/modules/conferencing/services/conferencing.service";
import { TeamsRepository } from "@/modules/teams/teams/teams.repository";
import { UserWithProfile } from "@/modules/users/users.repository";
import { BadRequestException, InternalServerErrorException, Logger } from "@nestjs/common";
import { Injectable } from "@nestjs/common";

import { CONFERENCING_APPS, CAL_VIDEO } from "@calcom/platform-constants";
import { teamMetadataSchema } from "@calcom/platform-libraries";
import { handleDeleteCredential } from "@calcom/platform-libraries/app-store";

@Injectable()
export class OrganizationsConferencingService {
  private logger = new Logger("OrganizationsConferencingService");

  constructor(
    private readonly conferencingRepository: ConferencingRepository,
    private teamsRepository: TeamsRepository,
    private readonly conferencingService: ConferencingService
  ) {}

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

  async validateAndCheckOrgTeamConferencingApp(teamIds: number[], app: string, credentialId?: number) {
    if (!CONFERENCING_APPS.includes(app)) {
      throw new BadRequestException("Invalid app, available apps are: ", CONFERENCING_APPS.join(", "));
    }
    const credentials = await this.conferencingRepository.findMultipleTeamsConferencingApp(teamIds, app);

    if (!credentials.length) {
      throw new BadRequestException(`${app} not connected.`);
    }

    // If credentialId is provided, verify it exists and is of the correct type
    if (credentialId) {
      const specificCredential = credentials.find((cred) => cred.id === credentialId);
      if (!specificCredential) {
        throw new BadRequestException(`Credential with ID ${credentialId} not found for app ${app}.`);
      }
      return specificCredential;
    }

    return credentials[0];
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

  async setDefaultConferencingApp({
    orgId,
    teamId,
    app,
    credentialId,
  }: {
    orgId?: number;
    teamId: number;
    app: string;
    credentialId?: number;
  }) {
    // cal-video is global, so we can skip this check
    if (app !== CAL_VIDEO) {
      await this.validateAndCheckOrgTeamConferencingApp(
        orgId ? [teamId, orgId] : [teamId],
        app,
        credentialId
      );
    }

    const team = await this.teamsRepository.setDefaultConferencingApp(teamId, app, undefined, credentialId);
    const metadata = team.metadata as { defaultConferencingApp?: { appSlug?: string } };
    if (metadata?.defaultConferencingApp?.appSlug !== app) {
      throw new InternalServerErrorException(`Could not set ${app} as default conferencing app`);
    }
    return true;
  }
}
