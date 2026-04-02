import type { Team } from "@calcom/prisma/client";
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Request } from "express";
import { OrganizationsRepository } from "@/modules/organizations/index/organizations.repository";
import { OrganizationsWebhooksRepository } from "@/modules/organizations/webhooks/organizations-webhooks.repository";
import { RedisService } from "@/modules/redis/redis.service";

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
      throw new ForbiddenException("IsWebhookInOrg - No organization id found in request params.");
    }
    if (!webhookId) {
      throw new ForbiddenException("IsWebhookInOrg - No webhook id found in request params.");
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

    const org = await this.organizationsRepository.findById({ id: Number(organizationId) });

    if (org?.isOrganization) {
      const isWebhookInOrg = await this.organizationsWebhooksRepository.findWebhook(
        Number(organizationId),
        webhookId
      );
      if (isWebhookInOrg) canAccess = true;
    }

    if (org && canAccess) {
      await this.redisService.redis.set(
        REDIS_CACHE_KEY,
        JSON.stringify({ org: org, canAccess } satisfies CachedData),
        "EX",
        300
      );
    }

    if (!canAccess) {
      throw new ForbiddenException(
        `IsWebhookInOrg - webhook with id=${webhookId} is not part of the organization with id=${organizationId}.`
      );
    }

    return true;
  }
}
