import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request } from "express";

import { PlatformPlan } from "../../../auth/decorators/billing/platform-plan.decorator";
import { GetUserReturnType } from "../../../auth/decorators/get-user/get-user.decorator";
import { PlatformPlanType } from "../../../billing/types";
import { OrganizationsRepository } from "../../../organizations/organizations.repository";

@Injectable()
export class PlatformPlanGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private readonly organizationsRepository: OrganizationsRepository
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const teamId = request.params.teamId as string;
    const orgId = request.params.orgId as string;
    const user = request.user as GetUserReturnType;
    const minimumPlan = this.reflector.get(PlatformPlan, context.getHandler()) as PlatformPlanType;

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
          plans: ["STARTER", "ESSENTIALS", "SCALE", "ENTERPRISE"],
        });
      }
    }

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
