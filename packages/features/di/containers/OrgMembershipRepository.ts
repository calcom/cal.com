import { moduleLoader as orgMembershipRepositoryModuleLoader } from "@calcom/features/bookings/di/OrgMembershipRepository.module";
import type { IOrgMembershipRepository } from "@calcom/features/membership/repositories/PrismaOrgMembershipRepository";
import { createContainer } from "../di";

const container = createContainer();

export function getOrgMembershipRepository(): IOrgMembershipRepository {
  orgMembershipRepositoryModuleLoader.loadModule(container);
  return container.get<IOrgMembershipRepository>(orgMembershipRepositoryModuleLoader.token);
}
