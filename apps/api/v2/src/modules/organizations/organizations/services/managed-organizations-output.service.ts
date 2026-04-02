import type { Team } from "@calcom/prisma/client";
import { Injectable } from "@nestjs/common";
import { plainToClass } from "class-transformer";
import { ManagedOrganizationOutput } from "@/modules/organizations/organizations/outputs/managed-organization.output";

@Injectable()
export class ManagedOrganizationsOutputService {
  getOutputManagedOrganization(managedOrganization: Team): ManagedOrganizationOutput {
    return plainToClass(ManagedOrganizationOutput, managedOrganization, { strategy: "excludeAll" });
  }
}
