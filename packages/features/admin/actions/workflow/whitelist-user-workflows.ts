import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";

import type { AdminUserRepository } from "../../repositories/admin-user-repository";
import type { AdminWorkflowRepository } from "../../repositories/admin-workflow-repository";
import type { AdminAction } from "../admin-action";

export interface WhitelistUserWorkflowsDeps {
  userRepo: AdminUserRepository;
  workflowRepo: AdminWorkflowRepository;
}

export interface WhitelistUserWorkflowsInput {
  userId: number;
  whitelistWorkflows: boolean;
}

export interface WhitelistUserWorkflowsResult {
  success: boolean;
  userId: number;
  whitelistWorkflows: boolean;
}

export class WhitelistUserWorkflowsAction
  implements AdminAction<WhitelistUserWorkflowsInput, WhitelistUserWorkflowsResult>
{
  constructor(private deps: WhitelistUserWorkflowsDeps) {}

  async execute(input: WhitelistUserWorkflowsInput): Promise<WhitelistUserWorkflowsResult> {
    const { userId, whitelistWorkflows } = input;

    const user = await this.deps.userRepo.findById(userId);

    if (!user) {
      throw new ErrorWithCode(ErrorCode.NotFound, `User ${userId} not found`);
    }

    const updated = await this.deps.workflowRepo.setWhitelisted(userId, whitelistWorkflows);

    return {
      success: true,
      userId,
      whitelistWorkflows: updated.whitelistWorkflows,
    };
  }
}
