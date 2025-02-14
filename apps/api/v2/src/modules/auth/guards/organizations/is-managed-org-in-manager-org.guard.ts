import { ManagedOrganizationsRepository } from "@/modules/organizations/organizations/managed-organizations.repository";
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { Request } from "express";

import { Team } from "@calcom/prisma/client";

@Injectable()
export class IsManagedOrgInManagerOrg implements CanActivate {
  constructor(private managedOrganizationsRepository: ManagedOrganizationsRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { managedOrganization: Team }>();
    const managedOrgId: string = request.params.managedOrganizationId;
    const managerOrgId: string = request.params.managerOrganizationId;

    if (!managerOrgId) {
      throw new ForbiddenException("No manager org id found in request params.");
    }

    if (!managedOrgId) {
      throw new ForbiddenException("No managed org id found in request params.");
    }

    const managedOrganization = await this.managedOrganizationsRepository.getByManagedManagerIds(
      Number(managerOrgId),
      Number(managedOrgId)
    );

    if (!managedOrganization) {
      throw new NotFoundException(
        `Managed organization with id=${managedOrgId} within manager organization with id=${managerOrgId} not found.`
      );
    }

    return true;
  }
}
