import { PlatformPlan } from "@/modules/auth/decorators/billing/platform-plan.decorator";
import { ApiAuthGuardUser } from "@/modules/auth/strategies/api-auth/api-auth.strategy";
import { PlatformPlanType, orderedPlans } from "@/modules/billing/types";
import { OrganizationsRepository } from "@/modules/organizations/index/organizations.repository";
import { RedisService } from "@/modules/redis/redis.service";
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request } from "express";

@Injectable()
export class PlatformPlanGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private readonly organizationsRepository: OrganizationsRepository,
    private readonly redisService: RedisService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const minimumPlan = this.reflector.get(PlatformPlan, context.getHandler()) as PlatformPlanType;
    if (!minimumPlan) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const orgId = request.params.orgId;
    const user = request.user as ApiAuthGuardUser;
    if (!user) {
      throw new ForbiddenException("PlatformPlanGuard - No user associated with the request.");
    }
    if (!orgId) {
      throw new ForbiddenException("PlatformPlanGuard - No organization associated with the request.");
    }

    return await this.checkPlatformPlanAccess(orgId, minimumPlan);
  }

  async checkPlatformPlanAccess(orgId: string, minimumPlan: PlatformPlanType) {
    const REDIS_CACHE_KEY = `apiv2:org:${orgId}:guard:platformbilling:${minimumPlan}`;
    const cachedValue = await this.redisService.redis.get(REDIS_CACHE_KEY);
    if (cachedValue !== null) {
      return cachedValue === "true";
    }

    const organization = await this.organizationsRepository.findByIdIncludeBilling(Number(orgId));
    const isPlatform = organization?.isPlatform;
    const hasSubscription = organization?.platformBilling?.subscriptionId;

    if (!organization) {
      throw new ForbiddenException(`PlatformPlanGuard - No organization found with id=${orgId}.`);
    }
    if (!isPlatform) {
      await this.redisService.redis.set(REDIS_CACHE_KEY, "true", "EX", 300);
      return true;
    }
    if (!hasSubscription) {
      throw new ForbiddenException(
        `PlatformPlanGuard - No platform subscription found for organization with id=${orgId}.`
      );
    }
    if (
      !hasMinimumPlan({
        currentPlan: organization.platformBilling?.plan as PlatformPlanType,
        minimumPlan: minimumPlan,
        plans: orderedPlans,
      })
    ) {
      throw new ForbiddenException(
        `PlatformPlanGuard - organization with id=${orgId} does not have required plan for this operation. Minimum plan is ${minimumPlan} while the organization has ${
          organization.platformBilling?.plan || "undefined"
        }.`
      );
    }

    await this.redisService.redis.set(REDIS_CACHE_KEY, "true", "EX", 300);
    return true;
  }
}

type HasMinimumPlanProp = {
  currentPlan: PlatformPlanType;
  minimumPlan: PlatformPlanType;
  plans: readonly PlatformPlanType[];
};

export function hasMinimumPlan(props: HasMinimumPlanProp): boolean {
  const currentPlanIndex = props.plans.indexOf(props.currentPlan);
  const minimumPlanIndex = props.plans.indexOf(props.minimumPlan);

  if (currentPlanIndex === -1 || minimumPlanIndex === -1) {
    throw new ForbiddenException(
      `PlatformPlanGuard - Invalid platform billing plan provided. Current plan: ${props.currentPlan}, Minimum plan: ${props.minimumPlan}`
    );
  }

  return currentPlanIndex >= minimumPlanIndex;
}
