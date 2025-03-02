import { CreateDwdInput } from "@/modules/organizations/dwd/inputs/create-dwd.input";
import {
  GoogleServiceAccountKeyInput,
  MicrosoftServiceAccountKeyInput,
} from "@/modules/organizations/dwd/inputs/service-account-key.input";
import { UpdateDwdInput } from "@/modules/organizations/dwd/inputs/update-dwd.input";
import { OrganizationsDwdRepository } from "@/modules/organizations/dwd/organizations-dwd.repository";
import { DwdOutput } from "@/modules/organizations/dwd/outputs/dwd.output";
import { Injectable, NotFoundException } from "@nestjs/common";
import { User } from "@prisma/client";

import { addDwd, toggleDwdEnabled, encryptServiceAccountKey } from "@calcom/platform-libraries";

@Injectable()
export class OrganizationsDwdService {
  constructor(private readonly organizationsDwdRepository: OrganizationsDwdRepository) {}
  async createDwd(orgId: number, dwdServiceAccountUser: User, body: CreateDwdInput) {
    console.log("asap body", JSON.stringify(body, null, 2));
    const dwd = await addDwd({
      input: body,
      ctx: { user: { id: dwdServiceAccountUser.id, organizationId: orgId } },
    });
    return dwd;
  }

  async updateDwd(orgId: number, dwdId: string, dwdServiceAccountUser: User, body: UpdateDwdInput) {
    if (body.enabled !== undefined) {
      await this.updateDwdEnabled(orgId, dwdId, dwdServiceAccountUser, body.enabled);
    }
    if (body.serviceAccountKey !== undefined) {
      await this.updateDwdServiceAccountKey(dwdId, body.serviceAccountKey);
    }
    const dwd = await this.organizationsDwdRepository.findByIdWithWorkspacePlatform(dwdId);
    if (!dwd) {
      throw new NotFoundException(`DWD with id ${dwdId} not found`);
    }

    return dwd;
  }

  async updateDwdEnabled(orgId: number, dwdId: string, dwdServiceAccountUser: User, enabled: boolean) {
    const handlerUser = {
      id: dwdServiceAccountUser.id,
      email: dwdServiceAccountUser.email,
      organizationId: orgId,
    };
    const handlerBody = { id: dwdId, enabled };
    const dwd = await toggleDwdEnabled(handlerUser, handlerBody);
    return dwd;
  }

  async updateDwdServiceAccountKey(
    dwdId: string,
    serviceAccountKey: GoogleServiceAccountKeyInput | MicrosoftServiceAccountKeyInput
  ) {
    const encryptedServiceAccountKey = encryptServiceAccountKey(serviceAccountKey);
    const dwd = await this.organizationsDwdRepository.updateIncludeWorkspacePlatform(dwdId, {
      serviceAccountKey: encryptedServiceAccountKey,
    });
    return dwd;
  }
}
