import { bindModuleToClassOnToken, createModule } from "@calcom/features/di/di";
import { DI_TOKENS } from "@calcom/features/di/tokens";
import { moduleLoader as membershipServiceModuleLoader } from "@calcom/features/users/di/MembershipService.module";
import { HashedLinkService } from "../lib/service/HashedLinkService";
import { moduleLoader as hashedLinkRepositoryModuleLoader } from "./HashedLinkRepository.module";

const thisModule = createModule();
const token = DI_TOKENS.HASHED_LINK_SERVICE;
const moduleToken = DI_TOKENS.HASHED_LINK_SERVICE_MODULE;
const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: HashedLinkService,
  depsMap: {
    hashedLinkRepository: hashedLinkRepositoryModuleLoader,
    membershipService: membershipServiceModuleLoader,
  },
});

export const moduleLoader = {
  token,
  loadModule,
};

export type { HashedLinkService };
