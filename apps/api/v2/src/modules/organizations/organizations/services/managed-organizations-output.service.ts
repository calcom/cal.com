import { ManagedOrganizationOutput } from "@/modules/organizations/organizations/outputs/managed-organization.output";
import { Injectable } from "@nestjs/common";

import { Team } from "@calcom/prisma/client";

@Injectable()
export class ManagedOrganizationsOutputService {
  getOutputManagedOrganization(managedOrganization: Team): ManagedOrganizationOutput {
    return {
      id: managedOrganization.id,
      name: managedOrganization.name,
      metadata: managedOrganization.metadata ? JSON.parse(managedOrganization.metadata as string) : {},
    };
  }
}
