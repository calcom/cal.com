import { encryptServiceAccountKey } from "@calcom/platform-libraries";
import {
  addDelegationCredential,
  type TServiceAccountKeySchema,
  toggleDelegationCredentialEnabled,
} from "@calcom/platform-libraries/app-store";
import type { DelegationCredential, Prisma, User } from "@calcom/prisma/client";
import { InjectQueue } from "@nestjs/bull";
import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Queue } from "bull";
import { AppConfig } from "@/config/type";
import {
  CALENDARS_QUEUE,
  DEFAULT_CALENDARS_JOB,
  DefaultCalendarsJobDataType,
} from "@/ee/calendars/processors/calendars.processor";
import { CalendarsTasker } from "@/lib/services/tasker/calendars-tasker.service";
import { CreateDelegationCredentialInput } from "@/modules/organizations/delegation-credentials/inputs/create-delegation-credential.input";
import {
  GoogleServiceAccountKeyInput,
  MicrosoftServiceAccountKeyInput,
} from "@/modules/organizations/delegation-credentials/inputs/service-account-key.input";
import { UpdateDelegationCredentialInput } from "@/modules/organizations/delegation-credentials/inputs/update-delegation-credential.input";
import { OrganizationsDelegationCredentialRepository } from "@/modules/organizations/delegation-credentials/organizations-delegation-credential.repository";

type DelegationCredentialWithWorkspacePlatform = {
  workspacePlatform: {
    name: string;
    id: number;
    enabled: boolean;
    createdAt: Date;
    updatedAt: Date;
    slug: string;
    description: string;
    defaultServiceAccountKey: Prisma.JsonValue;
  };
} & {
  id: string;
  organizationId: number;
  serviceAccountKey: Prisma.JsonValue;
  enabled: boolean;
  lastEnabledAt: Date | null;
  lastDisabledAt: Date | null;
  domain: string;
  createdAt: Date;
  updatedAt: Date;
  workspacePlatformId: number;
};

@Injectable()
export class OrganizationsDelegationCredentialService {
  private logger = new Logger("OrganizationsDelegationCredentialService");

  constructor(
    private readonly organizationsDelegationCredentialRepository: OrganizationsDelegationCredentialRepository,
    private readonly calendarsTasker: CalendarsTasker,
    private readonly configService: ConfigService<AppConfig>,
    @InjectQueue(CALENDARS_QUEUE) private readonly calendarsQueue: Queue
  ) {}
  async createDelegationCredential(
    orgId: number,
    delegatedServiceAccountUser: User,
    body: CreateDelegationCredentialInput
  ): Promise<Partial<Omit<DelegationCredential, "serviceAccountKey">> | null | undefined> {
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
  ): Promise<DelegationCredentialWithWorkspacePlatform> {
    let delegationCredential =
      await this.organizationsDelegationCredentialRepository.findByIdWithWorkspacePlatform(
        delegationCredentialId
      );

    if (!delegationCredential) {
      throw new NotFoundException(`DelegationCredential with id ${delegationCredentialId} not found`);
    }

    if (body.serviceAccountKey !== undefined) {
      const updatedDelegationCredential = await this.updateDelegationCredentialServiceAccountKey(
        delegationCredential.id,
        body.serviceAccountKey
      );
      delegationCredential = updatedDelegationCredential ?? delegationCredential;
    }

    if (body.enabled !== undefined) {
      await this.updateDelegationCredentialEnabled(
        orgId,
        delegationCredentialId,
        delegatedServiceAccountUser,
        body.enabled
      );
    }

    // once delegation credentials are enabled, slowly set all the destination calendars of delegated users
    if (body.enabled === true && delegationCredential.enabled === false) {
      await this.ensureDefaultCalendars(orgId, delegationCredential.domain);
    }

    return { ...delegationCredential, enabled: body?.enabled ?? delegationCredential.enabled };
  }

  async ensureDefaultCalendars(orgId: number, domain: string): Promise<void> {
    try {
      const delegatedUserProfiles =
        await this.organizationsDelegationCredentialRepository.findDelegatedUserProfiles(orgId, domain);

      const results = await Promise.allSettled(
        delegatedUserProfiles.map(async (profile) => {
          if (profile.userId) {
            if (this.configService.get("enableAsyncTasker")) {
              this.logger.log(`Adding default calendar job for user with id: ${profile.userId}`);
              await this.calendarsTasker.dispatch(
                "ensureDefaultCalendars",
                {
                  userId: profile.userId,
                },
                {
                  idempotencyKey: `${DEFAULT_CALENDARS_JOB}_${profile.userId}`,
                  idempotencyKeyTTL: "1h",
                  tags: [`${DEFAULT_CALENDARS_JOB}_${profile.userId}`],
                }
              );
              return;
            }

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
        })
      );

      const failures = results.filter(
        (result): result is PromiseRejectedResult => result.status === "rejected"
      );
      if (failures.length > 0) {
        this.logger.error(
          `Failed to ensure default calendars for ${failures.length} users in org ${orgId}: ${failures.map((f) => f.reason).join(", ")}`
        );
      }
    } catch (err) {
      this.logger.error(
        err,
        `Could not ensure default calendars for delegated users in org with id:${orgId}`
      );
    }
  }

  async ensureDefaultCalendarsForUser(orgId: number, userId: number, userEmail: string): Promise<void> {
    try {
      const emailParts = userEmail.split("@");
      if (emailParts.length < 2 || !emailParts[1]) {
        this.logger.warn(`Invalid email format for user ${userId}: missing domain`);
        return;
      }
      const emailDomain = `@${emailParts[1]}`;

      const delegationCredential =
        await this.organizationsDelegationCredentialRepository.findEnabledByOrgIdAndDomain(
          orgId,
          emailDomain
        );

      if (!delegationCredential) {
        return;
      }

      if (this.configService.get("enableAsyncTasker")) {
        this.logger.log(`Adding default calendar job for user with id: ${userId}`);
        await this.calendarsTasker.dispatch(
          "ensureDefaultCalendars",
          {
            userId,
          },
          { idempotencyKey: `${DEFAULT_CALENDARS_JOB}_${userId}`, idempotencyKeyTTL: "1h" }
        );
        return;
      }

      const existingJob = await this.calendarsQueue.getJob(`${DEFAULT_CALENDARS_JOB}_${userId}`);
      if (existingJob) {
        await existingJob.remove();
        this.logger.log(`Removed existing default calendar job for user with id: ${userId}`);
      }
      this.logger.log(`Adding default calendar job for user with id: ${userId}`);
      await this.calendarsQueue.add(DEFAULT_CALENDARS_JOB, { userId } satisfies DefaultCalendarsJobDataType, {
        jobId: `${DEFAULT_CALENDARS_JOB}_${userId}`,
        removeOnComplete: true,
      });
    } catch (err) {
      this.logger.error(
        err,
        `Could not ensure default calendars for user with id: ${userId} in org with id: ${orgId}`
      );
    }
  }

  async updateDelegationCredentialEnabled(
    orgId: number,
    delegationCredentialId: string,
    delegatedServiceAccountUser: User,
    enabled: boolean
  ): Promise<Partial<Omit<DelegationCredential, "serviceAccountKey">> | null | undefined> {
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
  ): Promise<DelegationCredentialWithWorkspacePlatform> {
    // First encrypt the service account key
    const encryptedServiceAccountKey = encryptServiceAccountKey(
      serviceAccountKey as TServiceAccountKeySchema
    );
    const prismaJsonValue = JSON.parse(JSON.stringify(encryptedServiceAccountKey));

    const delegationCredential =
      await this.organizationsDelegationCredentialRepository.updateIncludeWorkspacePlatform(
        delegationCredentialId,
        {
          serviceAccountKey: prismaJsonValue,
          enabled: false,
        }
      );
    return delegationCredential;
  }
}
