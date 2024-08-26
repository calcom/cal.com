import { OrganizationsRepository } from "@/modules/organizations/organizations.repository";
import { OrganizationsWebhooksRepository } from "@/modules/organizations/repositories/organizations-webhooks.repository";
import { RedisService } from "@/modules/redis/redis.service";
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Request } from "express";

import { Team } from "@calcom/prisma/client";

type CachedData = {
  org?: Team;
  canAccess?: boolean;
};

@Injectable()
export class IsWebhookInOrg implements CanActivate {
  constructor(
    private organizationsRepository: OrganizationsRepository,
    private organizationsWebhooksRepository: OrganizationsWebhooksRepository,
    private readonly redisService: RedisService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    let canAccess = false;
    const request = context.switchToHttp().getRequest<Request & { organization: Team }>();
    const webhookId: string = request.params.webhookId;
    const organizationId: string = request.params.orgId;

    if (!organizationId) {
      throw new ForbiddenException("No organization id found in request params.");
    }
    if (!webhookId) {
      throw new ForbiddenException("No webhook id found in request params.");
    }

    const REDIS_CACHE_KEY = `apiv2:org:${webhookId}:guard:isWebhookInOrg`;
    const cachedData = await this.redisService.redis.get(REDIS_CACHE_KEY);

    if (cachedData) {
      const { org: cachedOrg, canAccess: cachedCanAccess } = JSON.parse(cachedData) as CachedData;
      if (cachedOrg?.id === Number(organizationId) && cachedCanAccess !== undefined) {
        request.organization = cachedOrg;
        return cachedCanAccess;
      }
    }

    const org = await this.organizationsRepository.findById(Number(organizationId));

    if (org?.isOrganization) {
      const isWebhookInOrg = await this.organizationsWebhooksRepository.findWebhook(
        Number(organizationId),
        webhookId
      );
      if (isWebhookInOrg) canAccess = true;
    }

    if (org) {
      await this.redisService.redis.set(
        REDIS_CACHE_KEY,
        JSON.stringify({ org: org, canAccess } satisfies CachedData),
        "EX",
        300
      );
    }

    return canAccess;
  }
}
