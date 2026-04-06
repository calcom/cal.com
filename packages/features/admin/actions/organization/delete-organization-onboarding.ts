import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";

import type { AdminOrgOnboardingRepository } from "../../repositories/admin-org-onboarding-repository";
import type { AdminAction } from "../admin-action";

export interface DeleteOrganizationOnboardingDeps {
  orgOnboardingRepo: AdminOrgOnboardingRepository;
}

export interface DeleteOrganizationOnboardingInput {
  id: string;
}

export interface DeleteOrganizationOnboardingResult {
  success: boolean;
  id: string;
  name: string;
  slug: string;
}

export class DeleteOrganizationOnboardingAction
  implements AdminAction<DeleteOrganizationOnboardingInput, DeleteOrganizationOnboardingResult>
{
  constructor(private deps: DeleteOrganizationOnboardingDeps) {}

  async execute(input: DeleteOrganizationOnboardingInput): Promise<DeleteOrganizationOnboardingResult> {
    const { id } = input;

    const existing = await this.deps.orgOnboardingRepo.findById(id);

    if (!existing) {
      throw new ErrorWithCode(ErrorCode.NotFound, `Organization onboarding record ${id} not found`);
    }

    const deleted = await this.deps.orgOnboardingRepo.delete(id);

    return {
      success: true,
      id: deleted.id,
      name: deleted.name,
      slug: deleted.slug,
    };
  }
}
