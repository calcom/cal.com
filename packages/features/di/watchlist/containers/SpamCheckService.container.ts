import type { GlobalBlockingService } from "@calcom/features/watchlist/lib/service/GlobalBlockingService";
import type { OrganizationBlockingService } from "@calcom/features/watchlist/lib/service/OrganizationBlockingService";
import { SpamCheckService } from "@calcom/features/watchlist/lib/service/SpamCheckService";

import { getGlobalBlockingService, getOrganizationBlockingService } from "./watchlist";

export const getSpamCheckService = (): SpamCheckService => {
  const globalBlockingService = getGlobalBlockingService() as GlobalBlockingService;
  const organizationBlockingService = getOrganizationBlockingService() as OrganizationBlockingService;
  return new SpamCheckService(globalBlockingService, organizationBlockingService);
};
