import { createModule } from "@evyweb/ioctopus";

import { DI_TOKENS } from "@calcom/lib/di/tokens";

import { prisma, readonlyPrisma } from "./index";

export const prismaModule = createModule();

prismaModule.bind(DI_TOKENS.PRISMA_CLIENT).toFactory(() => prisma, "singleton");

prismaModule.bind(DI_TOKENS.READ_ONLY_PRISMA_CLIENT).toFactory(() => readonlyPrisma, "singleton");
