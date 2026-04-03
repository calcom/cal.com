import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";
import type {
  AdminOrgOnboardingRepository,
  UpdateOrgOnboardingData,
} from "../repositories/AdminOrgOnboardingRepository";
import type { AdminAction } from "./admin-action";

export interface EditOrganizationOnboardingDeps {
  orgOnboardingRepo: AdminOrgOnboardingRepository;
}

export interface EditOrganizationOnboardingInput {
  id: string;
  data: UpdateOrgOnboardingData;
}

export interface EditOrganizationOnboardingResult {
  success: boolean;
  id: string;
  name: string;
  slug: string;
}

export class EditOrganizationOnboardingAction
  implements AdminAction<EditOrganizationOnboardingInput, EditOrganizationOnboardingResult>
{
  constructor(private deps: EditOrganizationOnboardingDeps) {}

  async execute(input: EditOrganizationOnboardingInput): Promise<EditOrganizationOnboardingResult> {
    const { id, data } = input;

    const existing = await this.deps.orgOnboardingRepo.findById(id);

    if (!existing) {
      throw new ErrorWithCode(ErrorCode.NotFound, `Organization onboarding record ${id} not found`);
    }

    const updated = await this.deps.orgOnboardingRepo.update(id, data);

    return {
      success: true,
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
    };
  }
}
