import { RateLimitType } from "@/lib/throttler-guard";
import { Reflector } from "@nestjs/core";

export const Throttle = Reflector.createDecorator<RateLimitType>();
