import { createModule } from "@evyweb/ioctopus";

import { DI_TOKENS } from "@calcom/lib/di/tokens";
import { HostRepository } from "@calcom/lib/server/repository/host";

export const hostRepositoryModule = createModule();
hostRepositoryModule.bind(DI_TOKENS.HOST_REPOSITORY).toClass(HostRepository, [DI_TOKENS.PRISMA_CLIENT]);
