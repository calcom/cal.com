import prismock from "../../../../tests/libs/__mocks__/prisma";

import type { WatchlistSeverity, WatchlistType } from "@calcom/prisma/enums";

interface WatchlistInput {
  severity: WatchlistSeverity;
  type: WatchlistType;
  value: string;
}

export const createWatchlistEntry = async (input: WatchlistInput) => {
  await prismock.watchlist.create({
    data: {
      ...input,
      createdById: 0,
    },
  });
};
