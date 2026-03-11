import type { PrismaMembershipRepository } from "@calcom/features/membership/repositories/PrismaMembershipRepository";
import { moduleLoader as membershipRepositoryModuleLoader } from "@calcom/features/users/di/MembershipRepository.module";
import { createContainer } from "../di";

const container = createContainer();

export function getMembershipRepository(): PrismaMembershipRepository {
  membershipRepositoryModuleLoader.loadModule(container);
  return container.get<PrismaMembershipRepository>(membershipRepositoryModuleLoader.token);
}
