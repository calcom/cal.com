import type { IBlockingService } from "@calcom/features/watchlist/lib/interface/IBlockingService";
import { SpamCheckService } from "@calcom/features/watchlist/lib/service/SpamCheckService";

import { getGlobalBlockingService } from "./watchlist";

export const getSpamCheckService = (): SpamCheckService => {
  const blockingService = getGlobalBlockingService() as IBlockingService;
  return new SpamCheckService(blockingService);
};
