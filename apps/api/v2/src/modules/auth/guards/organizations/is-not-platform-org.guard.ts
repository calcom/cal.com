import { OrganizationsRepository } from "@/modules/organizations/index/organizations.repository";
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Request } from "express";

@Injectable()
export class IsNotPlatformOrgGuard implements CanActivate {
  constructor(private organizationsRepository: OrganizationsRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const orgId = request.params.orgId;

    if (!orgId) {
      throw new ForbiddenException("IsNotPlatformOrgGuard - No organization id found in request params.");
    }

    const organization = await this.organizationsRepository.findById({ id: Number(orgId) });

    if (!organization) {
      throw new ForbiddenException(
        `IsNotPlatformOrgGuard - Organization with id=${orgId} not found.`
      );
    }

    if (organization.isPlatform) {
      throw new ForbiddenException(
        "IsNotPlatformOrgGuard - Platform organizations are not permitted to perform this action."
      );
    }

    return true;
  }
}
