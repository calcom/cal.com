import { PlatformPlan } from "@/modules/auth/decorators/billing/platform-plan.decorator";
import { GetUserReturnType } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { PlatformPlanType } from "@/modules/billing/types";
import { OrganizationsRepository } from "@/modules/organizations/organizations.repository";
import { RedisService } from "@/modules/redis/redis.service";
import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
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
    const request = context.switchToHttp().getRequest<Request>();
    const teamId = request.params.teamId as string;
    const orgId = request.params.orgId as string;
    const user = request.user as GetUserReturnType;
    const minimumPlan = this.reflector.get(PlatformPlan, context.getHandler()) as PlatformPlanType;

    const REDIS_CACHE_KEY = `apiv2:user:${user?.id ?? "none"}:org:${orgId ?? "none"}:team:${
      teamId ?? "none"
    }:guard:platformbilling:${minimumPlan}`;

    const cachedAccess = JSON.parse((await this.redisService.redis.get(REDIS_CACHE_KEY)) ?? "false");

    if (cachedAccess) {
      return cachedAccess;
    }

    let canAccess = false;

    if (user && orgId) {
      const team = await this.organizationsRepository.findByIdIncludeBilling(Number(orgId));
      const isPlatform = team?.isPlatform;
      const hasSubscription = team?.platformBilling?.subscriptionId;

      if (!team) {
        canAccess = false;
      } else if (!isPlatform) {
        canAccess = true;
      } else if (!hasSubscription) {
        canAccess = false;
      } else {
        canAccess = hasMinimumPlan({
          currentPlan: team.platformBilling?.plan as PlatformPlanType,
          minimumPlan: minimumPlan,
          plans: ["FREE", "STARTER", "ESSENTIALS", "SCALE", "ENTERPRISE"],
        });
      }
    }

    await this.redisService.redis.set(REDIS_CACHE_KEY, String(canAccess), "EX", 300);
    return canAccess;
  }
}

type HasMinimumPlanProp = {
  currentPlan: PlatformPlanType;
  minimumPlan: PlatformPlanType;
  plans: PlatformPlanType[];
};

export function hasMinimumPlan(props: HasMinimumPlanProp): boolean {
  const currentPlanIndex = props.plans.indexOf(props.currentPlan);
  const minimumPlanIndex = props.plans.indexOf(props.minimumPlan);

  if (currentPlanIndex === -1 || minimumPlanIndex === -1) {
    throw new Error(
      `Invalid platform billing plan provided. Current plan: ${props.currentPlan}, Minimum plan: ${props.minimumPlan}`
    );
  }

  return currentPlanIndex >= minimumPlanIndex;
}
