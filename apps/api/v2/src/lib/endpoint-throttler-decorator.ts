import { Reflector } from "@nestjs/core";
import { RateLimitType } from "@/lib/throttler-guard";

export const Throttle = Reflector.createDecorator<RateLimitType>();
