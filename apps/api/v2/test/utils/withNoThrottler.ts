import { CustomThrottlerGuard } from "@/lib/throttler-guard";

export const mockThrottlerGuard = (): void => {
  jest
    .spyOn(
      CustomThrottlerGuard.prototype as unknown as { handleRequest: () => Promise<boolean> },
      "handleRequest"
    )
    .mockResolvedValue(true);
};
