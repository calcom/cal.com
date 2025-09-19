import { createModule } from "@evyweb/ioctopus";

import { DI_TOKENS } from "@calcom/lib/di/tokens";

import { PrismaWatchlistReadRepository } from "../../repositories/PrismaWatchlistReadRepository";
import { PrismaWatchlistRepository } from "../../repositories/PrismaWatchlistRepository";
import { PrismaWatchlistWriteRepository } from "../../repositories/PrismaWatchlistWriteRepository";
import { WATCHLIST_DI_TOKENS } from "../tokens";

export const watchlistRepositoryModule = createModule();

// Bind read repository
watchlistRepositoryModule
  .bind(WATCHLIST_DI_TOKENS.WATCHLIST_READ_REPOSITORY)
  .toClass(PrismaWatchlistReadRepository, [DI_TOKENS.PRISMA_CLIENT]);

// Bind write repository
watchlistRepositoryModule
  .bind(WATCHLIST_DI_TOKENS.WATCHLIST_WRITE_REPOSITORY)
  .toClass(PrismaWatchlistWriteRepository, [DI_TOKENS.PRISMA_CLIENT]);

// Bind combined repository
watchlistRepositoryModule
  .bind(WATCHLIST_DI_TOKENS.WATCHLIST_REPOSITORY)
  .toClass(PrismaWatchlistRepository, [
    WATCHLIST_DI_TOKENS.WATCHLIST_READ_REPOSITORY,
    WATCHLIST_DI_TOKENS.WATCHLIST_WRITE_REPOSITORY,
  ]);
