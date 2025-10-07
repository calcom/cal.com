import type { IBlockingService, BlockingResult } from "../interface/IBlockingService";

export class SpamCheckService {
  private spamCheckPromise: Promise<BlockingResult> | null = null;

  constructor(private readonly blockingService: IBlockingService) {}

  startCheck(email: string, organizationId?: number): void {
    this.spamCheckPromise = this.blockingService.isBlocked(email, organizationId);
  }

  async waitForCheck(): Promise<BlockingResult> {
    if (!this.spamCheckPromise) {
      return { isBlocked: false };
    }
    return await this.spamCheckPromise;
  }
}
