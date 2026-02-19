import type { Team } from "@calcom/prisma/client";
import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Request } from "express";
import { ApiAuthGuardUser } from "@/modules/auth/strategies/api-auth/api-auth.strategy";
import { OrganizationsRepository } from "@/modules/organizations/index/organizations.repository";

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

    const parsedOrgId = Number(orgId);

    if (!Number.isInteger(parsedOrgId) || parsedOrgId < 1) {
      throw new BadRequestException(
        `IsUserInBillingOrg - Invalid teamId: '${orgId}' is not a valid number. Please provide a number that is larger than 0.`
      );
    }

    const user = await this.organizationsRepository.findOrgUser(parsedOrgId, Number(userId));

    if (!user) {
      throw new ForbiddenException(
        `IsUserInBillingOrg - user with id=${userId} is not part of the organization with id=${orgId}.`
      );
    }

    return true;
  }
}
