import type { Team } from "@calcom/prisma/client";
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Request } from "express";
import { ManagedOrganizationsRepository } from "@/modules/organizations/organizations/managed-organizations.repository";

@Injectable()
export class IsManagedOrgInManagerOrg implements CanActivate {
  constructor(private managedOrganizationsRepository: ManagedOrganizationsRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { managedOrganization: Team }>();
    const managedOrgId: string = request.params.managedOrganizationId;
    const managerOrgId: string = request.params.orgId;

    if (!managerOrgId) {
      throw new ForbiddenException("IsManagedOrgInManagerOrg - No manager org id found in request params.");
    }

    if (!managedOrgId) {
      throw new ForbiddenException("IsManagedOrgInManagerOrg - No managed org id found in request params.");
    }

    const managedOrganization = await this.managedOrganizationsRepository.getByManagerManagedIds(
      Number(managerOrgId),
      Number(managedOrgId)
    );

    if (!managedOrganization) {
      throw new ForbiddenException(
        `IsManagedOrgInManagerOrg - Managed organization with id=${managedOrgId} is not owned by manager organization with id=${managerOrgId}.`
      );
    }

    return true;
  }
}
