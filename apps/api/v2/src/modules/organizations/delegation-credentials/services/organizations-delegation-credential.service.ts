import {
  CALENDARS_QUEUE,
  DEFAULT_CALENDARS_JOB,
  DefaultCalendarsJobDataType,
} from "@/ee/calendars/processors/calendars.processor";
import { CreateDelegationCredentialInput } from "@/modules/organizations/delegation-credentials/inputs/create-delegation-credential.input";
import {
  GoogleServiceAccountKeyInput,
  MicrosoftServiceAccountKeyInput,
} from "@/modules/organizations/delegation-credentials/inputs/service-account-key.input";
import { UpdateDelegationCredentialInput } from "@/modules/organizations/delegation-credentials/inputs/update-delegation-credential.input";
import { OrganizationsDelegationCredentialRepository } from "@/modules/organizations/delegation-credentials/organizations-delegation-credential.repository";
import { InjectQueue } from "@nestjs/bull";
import { Injectable, NotFoundException, Logger } from "@nestjs/common";
import { User } from "@prisma/client";
import { Queue } from "bull";

import { encryptServiceAccountKey } from "@calcom/platform-libraries";
import {
  addDelegationCredential,
  toggleDelegationCredentialEnabled,
} from "@calcom/platform-libraries/app-store";

@Injectable()
export class OrganizationsDelegationCredentialService {
  private logger = new Logger("OrganizationsDelegationCredentialService");

  constructor(
    private readonly organizationsDelegationCredentialRepository: OrganizationsDelegationCredentialRepository,
    @InjectQueue(CALENDARS_QUEUE) private readonly calendarsQueue: Queue
  ) {}
  async createDelegationCredential(
    orgId: number,
    delegatedServiceAccountUser: User,
    body: CreateDelegationCredentialInput
  ) {
    const delegationCredential = await addDelegationCredential({
      input: body,
      ctx: { user: { id: delegatedServiceAccountUser.id, organizationId: orgId } },
    });
    return delegationCredential;
  }

  async updateDelegationCredential(
    orgId: number,
    delegationCredentialId: string,
    delegatedServiceAccountUser: User,
    body: UpdateDelegationCredentialInput
  ) {
    const delegationCredential =
      await this.organizationsDelegationCredentialRepository.findByIdWithWorkspacePlatform(
        delegationCredentialId
      );

    if (!delegationCredential) {
      throw new NotFoundException(`DelegationCredential with id ${delegationCredentialId} not found`);
    }

    if (body.enabled !== undefined) {
      await this.updateDelegationCredentialEnabled(
        orgId,
        delegationCredentialId,
        delegatedServiceAccountUser,
        body.enabled
      );
    }
    if (body.serviceAccountKey !== undefined) {
      await this.updateDelegationCredentialServiceAccountKey(delegationCredentialId, body.serviceAccountKey);
    }

    // once delegation credentials are enabled, slowly set all the destination calendars of delegated users
    if (body.enabled === true && delegationCredential.enabled === false) {
      await this.ensureDefaultCalendars(orgId, delegationCredential.domain);
    }

    return { ...delegationCredential, enabled: body?.enabled ?? delegationCredential?.enabled };
  }

  async ensureDefaultCalendars(orgId: number, domain: string) {
    try {
      const delegatedUserProfiles =
        await this.organizationsDelegationCredentialRepository.findDelegatedUserProfiles(orgId, domain);

      delegatedUserProfiles.forEach(async (profile) => {
        if (profile.userId) {
          const job = await this.calendarsQueue.getJob(`${DEFAULT_CALENDARS_JOB}_${profile.userId}`);
          if (job) {
            await job.remove();
            this.logger.log(`Removed default calendar job for user with id: ${profile.userId}`);
          }
          this.logger.log(`Adding default calendar job for user with id: ${profile.userId}`);
          await this.calendarsQueue.add(
            DEFAULT_CALENDARS_JOB,
            {
              userId: profile.userId,
            } satisfies DefaultCalendarsJobDataType,
            { jobId: `${DEFAULT_CALENDARS_JOB}_${profile.userId}`, removeOnComplete: true }
          );
        }
      });
    } catch (err) {
      this.logger.error(
        err,
        `Could not ensure default calendars for delegated users in org with id:${orgId}`
      );
    }
  }

  async updateDelegationCredentialEnabled(
    orgId: number,
    delegationCredentialId: string,
    delegatedServiceAccountUser: User,
    enabled: boolean
  ) {
    const handlerUser = {
      id: delegatedServiceAccountUser.id,
      email: delegatedServiceAccountUser.email,
      organizationId: orgId,
    };
    const handlerBody = { id: delegationCredentialId, enabled };
    const delegationCredential = await toggleDelegationCredentialEnabled(handlerUser, handlerBody);
    return delegationCredential;
  }

  async updateDelegationCredentialServiceAccountKey(
    delegationCredentialId: string,
    serviceAccountKey: GoogleServiceAccountKeyInput | MicrosoftServiceAccountKeyInput
  ) {
    const encryptedServiceAccountKey = encryptServiceAccountKey(serviceAccountKey);
    const delegationCredential =
      await this.organizationsDelegationCredentialRepository.updateIncludeWorkspacePlatform(
        delegationCredentialId,
        {
          serviceAccountKey: encryptedServiceAccountKey,
        }
      );
    return delegationCredential;
  }
}
