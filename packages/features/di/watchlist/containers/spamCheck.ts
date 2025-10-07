import type { IBlockingService } from "@calcom/features/watchlist/lib/interface/IBlockingService";
import { SpamCheckService } from "@calcom/features/watchlist/lib/service/SpamCheckService";

import { getCombinedBlockingService } from "./watchlist";

export const getSpamCheckService = (): SpamCheckService => {
  const blockingService = getCombinedBlockingService() as IBlockingService;
  return new SpamCheckService(blockingService);
};
