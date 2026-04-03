import type { PrismaOOORepository } from "@calcom/features/ooo/repositories/prisma-ooo-repository";

import { type Container, createContainer } from "../di";
import { moduleLoader as oooRepositoryModuleLoader } from "../modules/Ooo";

const oooRepositoryContainer: Container = createContainer();

export function getOOORepository(): PrismaOOORepository {
  oooRepositoryModuleLoader.loadModule(oooRepositoryContainer);
  return oooRepositoryContainer.get<PrismaOOORepository>(oooRepositoryModuleLoader.token);
}
