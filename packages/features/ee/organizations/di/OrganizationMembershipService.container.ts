import { createContainer } from "@calcom/features/di/di";

import {
  type OrganizationMembershipService,
  moduleLoader as organizationMembershipServiceModule,
} from "./OrganizationMembershipService.module";

const organizationMembershipServiceContainer = createContainer();

export function getOrganizationMembershipService(): OrganizationMembershipService {
  organizationMembershipServiceModule.loadModule(organizationMembershipServiceContainer);

  return organizationMembershipServiceContainer.get<OrganizationMembershipService>(
    organizationMembershipServiceModule.token
  );
}
