import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";

import type { AdminUserRepository } from "../../repositories/admin-user-repository";
import type { AdminAction } from "../admin-action";

export interface RemoveTwoFactorDeps {
  userRepo: AdminUserRepository;
}

export interface RemoveTwoFactorInput {
  userId: number;
}

export interface RemoveTwoFactorResult {
  success: boolean;
  userId: number;
}

export class RemoveTwoFactorAction implements AdminAction<RemoveTwoFactorInput, RemoveTwoFactorResult> {
  constructor(private deps: RemoveTwoFactorDeps) {}

  async execute(input: RemoveTwoFactorInput): Promise<RemoveTwoFactorResult> {
    const { userId } = input;

    const user = await this.deps.userRepo.findById(userId);

    if (!user) {
      throw new ErrorWithCode(ErrorCode.NotFound, `User ${userId} not found`);
    }

    await this.deps.userRepo.removeTwoFactor(userId);

    return {
      success: true,
      userId,
    };
  }
}
