import { type Container, createModule } from "@calcom/features/di/di";
import { DI_TOKENS } from "@calcom/features/di/tokens";
import { prisma, readonlyPrisma } from "@calcom/prisma";

export const prismaModule = createModule();
const token = DI_TOKENS.PRISMA_CLIENT;
const readOnlyToken = DI_TOKENS.READ_ONLY_PRISMA_CLIENT;
const moduleToken = DI_TOKENS.PRISMA_MODULE;
prismaModule.bind(token).toFactory(() => prisma, "singleton");
prismaModule.bind(readOnlyToken).toFactory(() => readonlyPrisma, "singleton");

export const moduleLoader = {
  token,
  readOnlyToken,
  loadModule: (container: Container) => {
    container.load(moduleToken, prismaModule);
  },
};
