import { Reflector } from "@nestjs/core";

import type { PlatformPlanType } from "../../../billing/types";

export const PlatformPlan = Reflector.createDecorator<PlatformPlanType>();
