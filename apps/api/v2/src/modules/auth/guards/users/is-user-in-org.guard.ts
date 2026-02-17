import type { Team } from "@calcom/prisma/client";
import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Request } from "express";
import { OrganizationsRepository } from "@/modules/organizations/index/organizations.repository";

@Injectable()
export class IsUserInOrg implements CanActivate {
  constructor(private organizationsRepository: OrganizationsRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { team: Team }>();
    const orgId: string = request.params.orgId;
    const userId: string = request.params.userId;

    if (!userId) {
      throw new ForbiddenException("IsUserInOrg - No user id found in request params.");
    }

    if (!orgId) {
      throw new ForbiddenException("IsUserInOrg - No org id found in request params.");
    }

    const parsedUserId = Number(userId);
    const parsedOrgId = Number(orgId);

    if (!Number.isInteger(parsedUserId) || parsedUserId < 1) {
      throw new BadRequestException(
        `IsUserInOrg - Invalid userId: '${userId}' is not a valid number. Please provide a number that is larger than 0.`
      );
    }

    if (!Number.isInteger(parsedOrgId) || parsedOrgId < 1) {
      throw new BadRequestException(
        `IsUserInOrg - Invalid orgId: '${orgId}' is not a valid number. Please provide a number that is larger than 0.`
      );
    }

    const user = await this.organizationsRepository.findOrgUser(parsedOrgId, parsedUserId);

    if (!user) {
      throw new ForbiddenException(
        `IsUserInOrg - user with id=${userId} is not part of the organization with id=${orgId}.`
      );
    }

    request.user = user;
    return true;
  }
}
