import { getAdminWatchlistQueryService } from "@calcom/features/di/watchlist/containers/watchlist";
import { WatchlistType } from "@calcom/prisma/enums";
import type { TGetEntryImpactInputSchema } from "./getEntryImpact.schema";

const SUPPORTED_TYPES = new Set<WatchlistType>([WatchlistType.EMAIL, WatchlistType.DOMAIN]);

type GetEntryImpactOptions = {
  input: TGetEntryImpactInputSchema;
};

export const getEntryImpactHandler = async ({ input }: GetEntryImpactOptions) => {
  if (!SUPPORTED_TYPES.has(input.type)) {
    return null;
  }

  const service = getAdminWatchlistQueryService();
  return service.getEntryImpact({ type: input.type, value: input.value });
};
