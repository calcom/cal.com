import { GetBookingsRepositoryForWeb } from "@calcom/features/bookings/repositories/GetBookingsRepositoryForWeb";
import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as prismaModuleLoader } from "@calcom/features/di/modules/Prisma";
import { DI_TOKENS } from "@calcom/features/di/tokens";

const thisModule = createModule();
const token = DI_TOKENS.GET_BOOKINGS_REPOSITORY_FOR_WEB;
const moduleToken = DI_TOKENS.GET_BOOKINGS_REPOSITORY_FOR_WEB_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: GetBookingsRepositoryForWeb,
  depsMap: {
    prismaClient: prismaModuleLoader,
  },
});

export const moduleLoader = {
  token,
  loadModule,
} satisfies ModuleLoader;

export type { GetBookingsRepositoryForWeb };
