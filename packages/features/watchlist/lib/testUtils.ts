import prismock from "../../../../tests/libs/__mocks__/prisma";

import type { WatchlistType } from "@calcom/prisma/enums";

interface WatchlistInput {
  type: WatchlistType;
  value: string;
}

export const createWatchlistEntry = async (input: WatchlistInput) => {
  await prismock.watchlist.create({
    data: {
      ...input,
    },
  });
};
