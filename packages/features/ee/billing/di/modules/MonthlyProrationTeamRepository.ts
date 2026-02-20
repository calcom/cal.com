import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as prismaModuleLoader } from "@calcom/features/di/modules/Prisma";
import { MonthlyProrationTeamRepository } from "@calcom/features/ee/billing/repository/proration/MonthlyProrationTeamRepository";

import { DI_TOKENS } from "../tokens";

const thisModule = createModule();
const token = DI_TOKENS.MONTHLY_PRORATION_TEAM_REPOSITORY;
const moduleToken = DI_TOKENS.MONTHLY_PRORATION_TEAM_REPOSITORY_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: MonthlyProrationTeamRepository,
  dep: prismaModuleLoader,
});

export const monthlyProrationTeamRepositoryModuleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { MonthlyProrationTeamRepository };
