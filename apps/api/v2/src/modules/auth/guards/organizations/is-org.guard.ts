import type { Team } from "@calcom/prisma/client";
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Request } from "express";
import { OrganizationsRepository } from "@/modules/organizations/index/organizations.repository";
import { RedisService } from "@/modules/redis/redis.service";

type CachedData = {
  org?: Team;
  canAccess?: boolean;
};

@Injectable()
export class IsOrgGuard implements CanActivate {
  constructor(
    private organizationsRepository: OrganizationsRepository,
    private readonly redisService: RedisService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { organization: Team }>();
    const organizationId: string = request.params.orgId;

    if (!organizationId) {
      throw new ForbiddenException("IsOrgGuard - No organization id found in request params.");
    }

    const { canAccess, org } = await this.checkOrgAccess(organizationId);

    if (canAccess && org) {
      request.organization = org;
    }

    if (!canAccess) {
      throw new ForbiddenException(
        `IsOrgGuard - provided organization id=${organizationId} does not represent any existing organization.`
      );
    }

    return true;
  }

  async checkOrgAccess(organizationId: string): Promise<{ canAccess: boolean; org?: Team | null }> {
    const REDIS_CACHE_KEY = `apiv2:org:${organizationId}:guard:isOrg`;
    let canAccess = false;
    const cachedData = await this.redisService.redis.get(REDIS_CACHE_KEY);

    if (cachedData) {
      const { org: cachedOrg, canAccess: cachedCanAccess } = JSON.parse(cachedData) as CachedData;
      if (cachedOrg?.id === Number(organizationId) && cachedCanAccess !== undefined) {
        return {
          org: cachedOrg,
          canAccess: cachedCanAccess,
        };
      }
    }

    const org = await this.organizationsRepository.findById({ id: Number(organizationId) });

    if (org?.isOrganization) {
      canAccess = true;
    }

    if (org && canAccess) {
      await this.redisService.redis.set(
        REDIS_CACHE_KEY,
        JSON.stringify({ org, canAccess } satisfies CachedData),
        "EX",
        300
      );
    }

    return { canAccess, org };
  }
}
