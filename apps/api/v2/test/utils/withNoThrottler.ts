import { CustomThrottlerGuard } from "@/lib/throttler-guard";

export const mockThrottlerGuard = (): void => {
  jest.spyOn(CustomThrottlerGuard.prototype, "handleRequest").mockResolvedValue(true);
};
