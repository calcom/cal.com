import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { DI_TOKENS } from "@calcom/features/di/tokens";
import { MembershipService } from "@calcom/features/membership/services/membershipService";
import { moduleLoader as membershipRepositoryModuleLoader } from "./MembershipRepository.module";

const thisModule = createModule();
const token = DI_TOKENS.MEMBERSHIP_SERVICE;
const moduleToken = DI_TOKENS.MEMBERSHIP_SERVICE_MODULE;
const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: MembershipService,
  depsMap: {
    membershipRepository: membershipRepositoryModuleLoader,
  },
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { MembershipService };
