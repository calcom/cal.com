import { TestingModuleBuilder } from "@nestjs/testing";
import { NoOpThrottlerGuard } from "test/mocks/no-op-throttler-guard";
import { CustomThrottlerGuard } from "@/lib/throttler-guard";

export const withNoThrottler = (module: TestingModuleBuilder) =>
  module.overrideGuard(CustomThrottlerGuard).useClass(NoOpThrottlerGuard);
