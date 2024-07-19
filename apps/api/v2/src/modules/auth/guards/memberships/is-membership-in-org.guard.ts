import { OrganizationsMembershipRepository } from "@/modules/organizations/repositories/organizations-membership.repository";
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { Request } from "express";

import { Membership } from "@calcom/prisma/client";

@Injectable()
export class IsMembershipInOrg implements CanActivate {
  constructor(private organizationsMembershipRepository: OrganizationsMembershipRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { membership: Membership }>();
    const membershipId: string = request.params.membershipId;
    const orgId: string = request.params.orgId;

    if (!orgId) {
      throw new ForbiddenException("No org id found in request params.");
    }

    if (!membershipId) {
      throw new ForbiddenException("No membership id found in request params.");
    }

    const membership = await this.organizationsMembershipRepository.findOrgMembership(
      Number(orgId),
      Number(membershipId)
    );

    if (!membership) {
      throw new NotFoundException(`Membership (${membershipId}) not found.`);
    }

    request.membership = membership;
    return true;
  }
}
