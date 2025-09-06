import type { Container } from "@evyweb/ioctopus";
import { createModule } from "@evyweb/ioctopus";

import { DI_TOKENS } from "@calcom/lib/di/tokens";

import { prisma, readonlyPrisma } from "./index";

export const prismaModule = createModule();
const token = DI_TOKENS.PRISMA_CLIENT;
const moduleToken = DI_TOKENS.PRISMA_MODULE;
prismaModule.bind(DI_TOKENS.PRISMA_CLIENT).toFactory(() => prisma, "singleton");
prismaModule.bind(DI_TOKENS.READ_ONLY_PRISMA_CLIENT).toFactory(() => readonlyPrisma, "singleton");

export const moduleLoader = {
  token,
  loadModule: (container: Container) => {
    container.load(moduleToken, prismaModule);
  },
};
