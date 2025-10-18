import { DI_TOKENS } from "@calcom/features/di/tokens";
import { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";

import { createModule } from "../di";

export const membershipRepositoryModule = createModule();
membershipRepositoryModule
  .bind(DI_TOKENS.MEMBERSHIP_REPOSITORY)
  .toClass(MembershipRepository, [DI_TOKENS.PRISMA_CLIENT]);
