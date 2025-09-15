import { OrganizationsMembershipRepository } from "@/modules/organizations/memberships/organizations-membership.repository";
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { Request } from "express";

import type { Membership } from "@calcom/prisma/client";

@Injectable()
export class IsMembershipInOrg implements CanActivate {
  constructor(private organizationsMembershipRepository: OrganizationsMembershipRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { membership: Membership }>();
    const membershipId: string = request.params.membershipId;
    const orgId: string = request.params.orgId;

    if (!orgId) {
      throw new ForbiddenException("IsMembershipInOrg - No org id found in request params.");
    }

    if (!membershipId) {
      throw new ForbiddenException("IsMembershipInOrg - No membership id found in request params.");
    }

    const membership = await this.organizationsMembershipRepository.findOrgMembership(
      Number(orgId),
      Number(membershipId)
    );

    if (!membership) {
      throw new NotFoundException(`IsMembershipInOrg - Membership (${membershipId}) not found.`);
    }

    request.membership = membership;
    return true;
  }
}
