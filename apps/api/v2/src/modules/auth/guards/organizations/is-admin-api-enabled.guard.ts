import { OrganizationsRepository } from "@/modules/organizations/index/organizations.repository";
import { RedisService } from "@/modules/redis/redis.service";
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Request } from "express";

import type { Team } from "@calcom/prisma/client";

type CachedData = {
  org?: Team;
  canAccess?: boolean;
};

@Injectable()
export class IsAdminAPIEnabledGuard implements CanActivate {
  constructor(
    private organizationsRepository: OrganizationsRepository,
    private readonly redisService: RedisService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { organization?: Team }>();
    const organizationId: string = request.params.orgId;

    if (!organizationId) {
      throw new ForbiddenException("IsAdminAPIEnabledGuard - No organization id found in request params.");
    }

    const { canAccess, organization } = await this.checkAdminAPIEnabled(organizationId);
    if (organization) {
      request.organization = organization;
    }
    if (!canAccess) {
      throw new ForbiddenException(
        `IsAdminAPIEnabledGuard - Organization with id=${organizationId} does not have Admin API access. Please contact https://cal.com/sales to upgrade.`
      );
    }
    return true;
  }

  async checkAdminAPIEnabled(
    organizationId: string
  ): Promise<{ canAccess: boolean; organization?: Team | null }> {
    let canAccess = false;
    const REDIS_CACHE_KEY = `apiv2:org:${organizationId}:guard:isAdminAccess`;
    const cachedData = await this.redisService.redis.get(REDIS_CACHE_KEY);

    if (cachedData) {
      const { org: cachedOrg, canAccess: cachedCanAccess } = JSON.parse(cachedData) as CachedData;
      if (cachedOrg?.id === Number(organizationId) && cachedCanAccess !== undefined) {
        return {
          canAccess: cachedCanAccess,
          organization: cachedOrg,
        };
      }
    }

    const org = await this.organizationsRepository.findById({ id: Number(organizationId) });

    if (org?.isOrganization && !org?.isPlatform) {
      const adminAPIAccessIsEnabledInOrg = await this.organizationsRepository.fetchOrgAdminApiStatus(
        Number(organizationId)
      );
      if (!adminAPIAccessIsEnabledInOrg) {
        throw new ForbiddenException(
          `IsAdminAPIEnabledGuard - Organization does not have Admin API access, please contact https://cal.com/sales to upgrade`
        );
      }
    }
    canAccess = true;

    if (org && canAccess) {
      await this.redisService.redis.set(
        REDIS_CACHE_KEY,
        JSON.stringify({ org: org, canAccess } satisfies CachedData),
        "EX",
        300
      );
    }

    return { canAccess, organization: org };
  }
}
