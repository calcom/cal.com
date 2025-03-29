import { Prisma } from "@prisma/client";
import type { DefaultArgs, InternalArgs } from "@prisma/client/runtime/library";

import { WatchlistRepository } from "@calcom/features/watchlist/watchlist.repository";

export function autoLockUsersExtension() {
  return Prisma.defineExtension({
    query: {
      user: {
        async create({ args, query }) {
          return autoLockUser(args, query);
        },
        async update({ args, query }) {
          return autoLockUser(args, query);
        },
        async upsert({ args, query }) {
          if (args.create) {
            args.create = (await shouldLockUser(args.create))
              ? { ...args.create, locked: true }
              : args.create;
          }
          if (args.update) {
            args.update = (await shouldLockUser(args.update))
              ? { ...args.update, locked: true }
              : args.update;
          }
          return query(args);
        },
      },
    },
  });
}

async function shouldLockUser(data: any) {
  if (!data.email) return false;

  // Check if email is in watchlist with critical severity
  const watchlistRepository = new WatchlistRepository();
  const watchlistResult = await watchlistRepository.getBlockedEmailInWatchlist(data.email);
  const isInWatchlist = !!watchlistResult;

  return isInWatchlist;
}

async function autoLockUser(
  args: Prisma.UserCreateArgs<InternalArgs & DefaultArgs> | Prisma.UserUpdateArgs<InternalArgs & DefaultArgs>,
  query: <T>(args: T) => Promise<unknown>
) {
  if (await shouldLockUser(args.data)) {
    args.data = { ...args.data, locked: true };
  }
  return query(args);
}
