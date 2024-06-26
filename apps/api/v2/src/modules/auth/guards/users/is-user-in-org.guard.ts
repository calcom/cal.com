import { OrganizationsRepository } from "@/modules/organizations/organizations.repository";
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Request } from "express";

import { Team } from "@calcom/prisma/client";

@Injectable()
export class IsUserInOrg implements CanActivate {
  constructor(private organizationsRepository: OrganizationsRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { team: Team }>();
    const orgId: string = request.params.orgId;
    const userId: string = request.params.userId;

    if (!userId) {
      throw new ForbiddenException("No user id found in request params.");
    }

    if (!orgId) {
      throw new ForbiddenException("No org id found in request params.");
    }

    const user = await this.organizationsRepository.findOrgUser(Number(orgId), Number(userId));

    if (user) {
      request.user = user;
      return true;
    }

    return false;
  }
}
