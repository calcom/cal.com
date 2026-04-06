import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";

import type { AdminUserRepository } from "../../repositories/admin-user-repository";
import type { AdminWorkflowRepository } from "../../repositories/admin-workflow-repository";
import type { AdminAction } from "../admin-action";

export interface VerifyWorkflowsDeps {
  userRepo: AdminUserRepository;
  workflowRepo: AdminWorkflowRepository;
}

export interface VerifyWorkflowsInput {
  userId: number;
}

export interface VerifyWorkflowsResult {
  success: boolean;
  userId: number;
  verifiedCount: number;
}

export class VerifyWorkflowsAction implements AdminAction<VerifyWorkflowsInput, VerifyWorkflowsResult> {
  constructor(private deps: VerifyWorkflowsDeps) {}

  async execute(input: VerifyWorkflowsInput): Promise<VerifyWorkflowsResult> {
    const { userId } = input;

    const user = await this.deps.userRepo.findById(userId);

    if (!user) {
      throw new ErrorWithCode(ErrorCode.NotFound, `User ${userId} not found`);
    }

    const result = await this.deps.workflowRepo.verifyUnverifiedSteps(userId);

    return {
      success: true,
      userId,
      verifiedCount: result.count,
    };
  }
}
