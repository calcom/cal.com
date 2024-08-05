import type { PlatformPlanType } from "@/modules/billing/types";
import { Reflector } from "@nestjs/core";

export const PlatformPlan = Reflector.createDecorator<PlatformPlanType>();
