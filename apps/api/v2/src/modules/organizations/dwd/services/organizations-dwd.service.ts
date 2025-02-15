import { CreateDwdInput } from "@/modules/organizations/dwd/inputs/create-dwd.input";
import { UpdateDwdInput } from "@/modules/organizations/dwd/inputs/update-dwd.input";
import { Injectable } from "@nestjs/common";
import { User } from "@prisma/client";

import { addDwd, toggleDwdEnabled } from "@calcom/platform-libraries";

@Injectable()
export class OrganizationsDwdService {
  async createDwd(orgId: number, dwdServiceAccountUser: User, body: CreateDwdInput) {
    const dwd = await addDwd({
      input: body,
      ctx: { user: { id: dwdServiceAccountUser.id, organizationId: orgId } },
    });
    return dwd;
  }

  async updateDwd(orgId: number, dwdId: string, dwdServiceAccountUser: User, body: UpdateDwdInput) {
    const handlerUser = {
      id: dwdServiceAccountUser.id,
      email: dwdServiceAccountUser.email,
      organizationId: orgId,
    };
    const handlerBody = { id: dwdId, enabled: body.enabled };
    const dwd = await toggleDwdEnabled(handlerUser, handlerBody);
    return dwd;
  }
}
