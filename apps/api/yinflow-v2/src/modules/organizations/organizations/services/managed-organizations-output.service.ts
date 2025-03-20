import { Injectable } from "@nestjs/common";

import { Team } from "@calcom/prisma/client";

import { ManagedOrganizationOutput } from "../../../organizations/organizations/outputs/managed-organization.output";

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
