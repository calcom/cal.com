import { Reflector } from "@nestjs/core";
import type { PlatformPlanType } from "src/modules/billing/types";

export const PlatformPlan = Reflector.createDecorator<PlatformPlanType>();
