import { type Container, createModule } from "@calcom/features/di/di";
import { DI_TOKENS } from "@calcom/features/di/tokens";
import { prisma, readonlyPrisma } from "@calcom/prisma";

import { usageTrackingExtention } from "../../prisma-extensions/usage-tracking";

export const prismaEEModule = createModule();
const token = DI_TOKENS.PRISMA_CLIENT;
const readOnlyToken = DI_TOKENS.READ_ONLY_PRISMA_CLIENT;
const moduleToken = DI_TOKENS.PRISMA_MODULE;

const prismaWithUsageTracking = prisma.$extends(usageTrackingExtention(prisma));

prismaEEModule.bind(token).toFactory(() => prismaWithUsageTracking, "singleton");
prismaEEModule.bind(readOnlyToken).toFactory(() => readonlyPrisma, "singleton");

export const moduleLoader = {
  token,
  readOnlyToken,
  loadModule: (container: Container) => {
    container.load(moduleToken, prismaEEModule);
  },
};
