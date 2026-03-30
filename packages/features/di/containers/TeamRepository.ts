import { moduleLoader as teamRepositoryModuleLoader } from "@calcom/features/di/modules/Team";
import type { TeamRepository } from "@calcom/features/ee/teams/repositories/TeamRepository";
import { type Container, createContainer } from "../di";

const container: Container = createContainer();

export function getTeamRepository(): TeamRepository {
  teamRepositoryModuleLoader.loadModule(container);
  return container.get<TeamRepository>(teamRepositoryModuleLoader.token);
}
