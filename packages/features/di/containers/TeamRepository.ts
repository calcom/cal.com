import { moduleLoader as teamRepositoryModuleLoader } from "@calcom/features/di/modules/Team";
import { TeamRepository } from "@calcom/features/ee/teams/repositories/TeamRepository";
import { type Container, createContainer } from "../di";

const container: Container = createContainer();
type TeamRepositoryClient = ConstructorParameters<typeof TeamRepository>[0];

export function getTeamRepository(prismaClient?: TeamRepositoryClient): TeamRepository {
  if (prismaClient !== undefined) {
    return new TeamRepository(prismaClient);
  }

  teamRepositoryModuleLoader.loadModule(container);
  return container.get<TeamRepository>(teamRepositoryModuleLoader.token);
}
