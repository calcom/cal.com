import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Request } from "express";

import { Team } from "@calcom/prisma/client";

import { OrganizationsRepository } from "../../../organizations/organizations.repository";

type CachedData = {
  org?: Team;
  canAccess?: boolean;
};

@Injectable()
export class IsOrgGuard implements CanActivate {
  constructor(private organizationsRepository: OrganizationsRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    let canAccess = false;
    const request = context.switchToHttp().getRequest<Request & { organization: Team }>();
    const organizationId: string = request.params.orgId;

    if (!organizationId) {
      throw new ForbiddenException("No organization id found in request params.");
    }

    const org = await this.organizationsRepository.findById(Number(organizationId));

    if (org?.isOrganization) {
      request.organization = org;
      canAccess = true;
    }

    return canAccess;
  }
}
