import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Request } from "express";

import { Team } from "@calcom/prisma/client";

import { OrganizationsRepository } from "../../../organizations/organizations.repository";

@Injectable()
export class IsAdminAPIEnabledGuard implements CanActivate {
  constructor(private organizationsRepository: OrganizationsRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    let canAccess = false;
    const request = context.switchToHttp().getRequest<Request & { organization: Team }>();
    const organizationId: string = request.params.orgId;

    if (!organizationId) {
      throw new ForbiddenException("No organization id found in request params.");
    }

    const org = await this.organizationsRepository.findById(Number(organizationId));

    if (org?.isOrganization && !org?.isPlatform) {
      const adminAPIAccessIsEnabledInOrg = await this.organizationsRepository.fetchOrgAdminApiStatus(
        Number(organizationId)
      );
      if (!adminAPIAccessIsEnabledInOrg) {
        throw new ForbiddenException(
          `Organization does not have Admin API access, please contact https://cal.com/sales to upgrade`
        );
      }
    }
    canAccess = true;
    return canAccess;
  }
}
