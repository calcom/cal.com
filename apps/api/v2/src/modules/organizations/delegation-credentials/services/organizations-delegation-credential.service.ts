import { CreateDelegationCredentialInput } from "@/modules/organizations/delegation-credentials/inputs/create-delegation-credential.input";
import {
  GoogleServiceAccountKeyInput,
  MicrosoftServiceAccountKeyInput,
} from "@/modules/organizations/delegation-credentials/inputs/service-account-key.input";
import { UpdateDelegationCredentialInput } from "@/modules/organizations/delegation-credentials/inputs/update-delegation-credential.input";
import { OrganizationsDelegationCredentialRepository } from "@/modules/organizations/delegation-credentials/organizations-delegation-credential.repository";
import { DelegationCredentialOutput } from "@/modules/organizations/delegation-credentials/outputs/delegation-credential.output";
import { Injectable, NotFoundException } from "@nestjs/common";
import { User } from "@prisma/client";

import {
  addDelegationCredential,
  toggleDelegationCredentialEnabled,
  encryptServiceAccountKey,
} from "@calcom/platform-libraries";

@Injectable()
export class OrganizationsDelegationCredentialService {
  constructor(
    private readonly organizationsDelegationCredentialRepository: OrganizationsDelegationCredentialRepository
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
    const delegationCredential =
      await this.organizationsDelegationCredentialRepository.findByIdWithWorkspacePlatform(
        delegationCredentialId
      );
    if (!delegationCredential) {
      throw new NotFoundException(`DelegationCredential with id ${delegationCredentialId} not found`);
    }

    return delegationCredential;
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
