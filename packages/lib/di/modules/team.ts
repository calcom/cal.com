import { createModule } from "@evyweb/ioctopus";

import { DI_TOKENS } from "@calcom/lib/di/tokens";
import { TeamRepository } from "@calcom/lib/server/repository/team";

export const teamRepositoryModule = createModule();
teamRepositoryModule.bind(DI_TOKENS.TEAM_REPOSITORY).toClass(TeamRepository, [DI_TOKENS.PRISMA_CLIENT]);
