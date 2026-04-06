import { createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as prismaModuleLoader } from "@calcom/features/di/modules/Prisma";
import { moduleLoader as userRepositoryModuleLoader } from "@calcom/features/di/modules/User";
import { WATCHLIST_DI_TOKENS } from "@calcom/features/di/watchlist/Watchlist.tokens";
import { watchlistModule } from "@calcom/features/di/watchlist/modules/Watchlist.module";
import { DI_TOKENS } from "@calcom/features/di/tokens";
import { UserUnblockService } from "@calcom/features/watchlist/lib/service/UserUnblockService";
import type { IGlobalWatchlistRepository } from "@calcom/features/watchlist/lib/interface/IWatchlistRepositories";
import type { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import type { ResolveFunction } from "@evyweb/ioctopus";

import { ADMIN_DI_TOKENS } from "../../tokens";

const thisModule = createModule();

thisModule.bind(ADMIN_DI_TOKENS.user.UNBLOCK_SERVICE).toFactory((resolve: ResolveFunction) => {
  const watchlistRepo = resolve(WATCHLIST_DI_TOKENS.GLOBAL_WATCHLIST_REPOSITORY) as IGlobalWatchlistRepository;
  const userRepo = resolve(DI_TOKENS.USER_REPOSITORY) as UserRepository;
  return new UserUnblockService({ watchlistRepo, userRepo });
});

export function loadModule(container: Parameters<ModuleLoader["loadModule"]>[0]): void {
  prismaModuleLoader.loadModule(container);
  userRepositoryModuleLoader.loadModule(container);
  container.load(WATCHLIST_DI_TOKENS.GLOBAL_WATCHLIST_REPOSITORY, watchlistModule);
  container.load(ADMIN_DI_TOKENS.user.UNBLOCK_SERVICE_MODULE, thisModule);
}

export const userUnblockServiceModuleLoader: ModuleLoader = {
  token: ADMIN_DI_TOKENS.user.UNBLOCK_SERVICE,
  loadModule,
};
