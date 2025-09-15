import { ManagedOrganizationOutput } from "@/modules/organizations/organizations/outputs/managed-organization.output";
import { Injectable } from "@nestjs/common";
import { plainToClass } from "class-transformer";

import type { Team } from "@calcom/prisma/client";

@Injectable()
export class ManagedOrganizationsOutputService {
  getOutputManagedOrganization(managedOrganization: Team): ManagedOrganizationOutput {
    return plainToClass(ManagedOrganizationOutput, managedOrganization, { strategy: "excludeAll" });
  }
}
