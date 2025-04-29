import { Reflector } from "@nestjs/core";

import type { RateLimitType } from "./throttler-guard.ts";

export const Throttle = Reflector.createDecorator<RateLimitType>();
