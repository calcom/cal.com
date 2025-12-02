import { ApiAuthGuardUser } from "@/modules/auth/strategies/api-auth/api-auth.strategy";
import { OrganizationsRepository } from "@/modules/organizations/index/organizations.repository";
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Request } from "express";

import type { Team } from "@calcom/prisma/client";

@Injectable()
export class IsUserInBillingOrg implements CanActivate {
  constructor(private organizationsRepository: OrganizationsRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { team: Team }>();
    const orgId: string = request.params.teamId;
    const userId = (request.user as ApiAuthGuardUser).id;

    if (!userId) {
      throw new ForbiddenException("IsUserInBillingOrg - No user id found.");
    }

    if (!orgId) {
      throw new ForbiddenException("IsUserInBillingOrg - No org id found in request params.");
    }

    const user = await this.organizationsRepository.findOrgUser(Number(orgId), Number(userId));

    if (!user) {
      throw new ForbiddenException(
        `IsUserInBillingOrg - user with id=${userId} is not part of the organization with id=${orgId}.`
      );
    }

    return true;
  }
}
