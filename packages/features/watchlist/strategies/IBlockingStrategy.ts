import type { BlockingResult } from "../interfaces/IBlockingService";

export interface IBlockingStrategy {
  isBlocked(email: string, organizationId?: number): Promise<BlockingResult>;
}
