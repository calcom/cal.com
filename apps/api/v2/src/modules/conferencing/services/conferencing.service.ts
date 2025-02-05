import { ConferencingRepository } from "@/modules/conferencing/repositories/conferencing.respository";
import { UserWithProfile } from "@/modules/users/users.repository";
import { UsersRepository } from "@/modules/users/users.repository";
import { BadRequestException, InternalServerErrorException, Logger } from "@nestjs/common";
import { Injectable } from "@nestjs/common";

import { CONFERENCING_APPS, CAL_VIDEO } from "@calcom/platform-constants";
import { userMetadata, handleDeleteCredential } from "@calcom/platform-libraries";

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

  async checkAppIsValidAndConnected(userId: number, app: string) {
    if (!CONFERENCING_APPS.includes(app)) {
      throw new BadRequestException("Invalid app, available apps are: ", CONFERENCING_APPS.join(", "));
    }
    const credential = await this.conferencingRepository.findConferencingApp(userId, app);

    if (!credential) {
      throw new BadRequestException(`${app} not connected.`);
    }
    return credential;
  }

  async disconnectConferencingApp(user: UserWithProfile, app: string) {
    const credential = await this.checkAppIsValidAndConnected(user.id, app);
    return handleDeleteCredential({
      userId: user.id,
      userMetadata: user?.metadata,
      credentialId: credential.id,
    });
  }

  async setDefaultConferencingApp(userId: number, app: string) {
    // cal-video is global, so we can skip this check
    if (app !== CAL_VIDEO) {
      await this.checkAppIsValidAndConnected(userId, app);
    }
    const user = await this.usersRepository.setDefaultConferencingApp(userId, app);
    const metadata = user.metadata as { defaultConferencingApp?: { appSlug?: string } };
    if (metadata?.defaultConferencingApp?.appSlug !== app) {
      throw new InternalServerErrorException(`Could not set ${app} as default conferencing app`);
    }
    return true;
  }
}
