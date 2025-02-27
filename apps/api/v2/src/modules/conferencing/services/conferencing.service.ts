import { ConferencingRepository } from "@/modules/conferencing/repositories/conferencing.repository";
import { UserWithProfile } from "@/modules/users/users.repository";
import { UsersRepository } from "@/modules/users/users.repository";
import { BadRequestException, InternalServerErrorException, Logger } from "@nestjs/common";
import { Injectable } from "@nestjs/common";

import { CONFERENCING_APPS, CAL_VIDEO } from "@calcom/platform-constants";
import {
  userMetadata,
  handleDeleteCredential,
  getApps,
  getUsersCredentials,
} from "@calcom/platform-libraries";

@Injectable()
export class ConferencingService {
  private logger = new Logger("ConferencingService");

  constructor(
    private readonly conferencingRepository: ConferencingRepository,
    private readonly usersRepository: UsersRepository
  ) {}

  async getConferencingApps(userId: number) {
    return this.conferencingRepository.findConferencingApps(userId);
  }

  async getUserDefaultConferencingApp(userId: number) {
    const user = await this.usersRepository.findById(userId);
    return userMetadata.parse(user?.metadata)?.defaultConferencingApp;
  }

  async checkAppIsValidAndConnected(user: UserWithProfile, appSlug: string) {
    if (!CONFERENCING_APPS.includes(appSlug)) {
      throw new BadRequestException("Invalid app, available apps are: ", CONFERENCING_APPS.join(", "));
    }
    const credentials = await getUsersCredentials(user);

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
}
