import { createModule } from "@evyweb/ioctopus";

import { HostRepository } from "@calcom/lib/server/repository/host";

import { DI_TOKENS } from "../tokens";

export const hostRepositoryModule = createModule();
hostRepositoryModule.bind(DI_TOKENS.HOST_REPOSITORY).toClass(HostRepository, {
  prismaClient: DI_TOKENS.PRISMA_CLIENT,
});
