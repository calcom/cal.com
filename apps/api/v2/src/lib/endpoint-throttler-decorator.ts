/** Documents apps/api/v2/src/lib/endpoint-throttler-decorator.ts module purpose and public usage context */
import { RateLimitType } from "@/lib/throttler-guard";
import { Reflector } from "@nestjs/core";

export const Throttle = Reflector.createDecorator<RateLimitType>();
