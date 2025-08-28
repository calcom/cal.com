import { createModule } from "@evyweb/ioctopus";

import { DI_TOKENS } from "@calcom/lib/di/tokens";
import { MembershipRepository } from "@calcom/lib/server/repository/membership";

export const membershipRepositoryModule = createModule();
membershipRepositoryModule
  .bind(DI_TOKENS.MEMBERSHIP_REPOSITORY)
  .toClass(MembershipRepository, [DI_TOKENS.PRISMA_CLIENT]);
