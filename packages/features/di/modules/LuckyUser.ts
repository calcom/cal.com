import { LuckyUserService } from "@calcom/features/bookings/lib/getLuckyUser";
import { DI_TOKENS } from "@calcom/features/di/tokens";
import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "../di";
import { moduleLoader as attributeRepositoryModuleLoader } from "./Attribute";
import { moduleLoader as bookingRepositoryModuleLoader } from "./Booking";
import { moduleLoader as hostRepositoryModuleLoader } from "./Host";
import { moduleLoader as oooRepositoryModuleLoader } from "./Ooo";
import { moduleLoader as userRepositoryModuleLoader } from "./User";

const thisModule = createModule();
const token = DI_TOKENS.LUCKY_USER_SERVICE;
const moduleToken = DI_TOKENS.LUCKY_USER_SERVICE_MODULE;
const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: LuckyUserService,
  depsMap: {
    bookingRepository: bookingRepositoryModuleLoader,
    hostRepository: hostRepositoryModuleLoader,
    oooRepository: oooRepositoryModuleLoader,
    userRepository: userRepositoryModuleLoader,
    attributeRepository: attributeRepositoryModuleLoader,
  },
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { LuckyUserService };
