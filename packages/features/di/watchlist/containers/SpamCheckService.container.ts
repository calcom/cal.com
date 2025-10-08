import type { GlobalBlockingService } from "@calcom/features/watchlist/lib/service/GlobalBlockingService";
import { SpamCheckService } from "@calcom/features/watchlist/lib/service/SpamCheckService";

import { getGlobalBlockingService } from "./watchlist";

export const getSpamCheckService = (): SpamCheckService => {
  const globalBlockingService = getGlobalBlockingService() as GlobalBlockingService;
  return new SpamCheckService(globalBlockingService);
};
