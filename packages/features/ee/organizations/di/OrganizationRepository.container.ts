import { createContainer } from "@calcom/features/di/di";

import {
  type OrganizationRepository,
  moduleLoader as organizationRepositoryModule,
} from "./OrganizationRepository.module";

const organizationRepositoryContainer = createContainer();

export function getOrganizationRepository(): OrganizationRepository {
  organizationRepositoryModule.loadModule(organizationRepositoryContainer);

  return organizationRepositoryContainer.get<OrganizationRepository>(organizationRepositoryModule.token);
}
