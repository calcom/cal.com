import { OrganizationsRepository } from "@/modules/organizations/organizations.repository";
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Request } from "express";

import { Team } from "@calcom/prisma/client";

@Injectable()
export class isOrgGuard implements CanActivate {
  constructor(private organizationsRepository: OrganizationsRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { organization: Team }>();
    const organizationId: string = request.params.orgId;

    if (!organizationId) {
      throw new ForbiddenException("No organization id found in request params.");
    }

    const org = await this.organizationsRepository.findById(Number(organizationId));

    if (org && org.isOrganization) {
      request.organization = org;
      return true;
    }

    return false;
  }
}
