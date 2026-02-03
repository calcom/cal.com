import { ManagedEventReassignmentService } from "@calcom/features/ee/managed-event-types/reassignment/services/ManagedEventReassignmentService";
import { DI_TOKENS } from "@calcom/features/di/tokens";

import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "../di";
import { moduleLoader as bookingRepositoryModuleLoader } from "./Booking";
import { moduleLoader as eventTypeRepositoryModuleLoader } from "./EventType";
import { moduleLoader as userRepositoryModuleLoader } from "./User";
import { moduleLoader as luckyUserServiceModuleLoader } from "./LuckyUser";

const thisModule = createModule();
const token = DI_TOKENS.MANAGED_EVENT_REASSIGNMENT_SERVICE;
const moduleToken = DI_TOKENS.MANAGED_EVENT_REASSIGNMENT_SERVICE_MODULE;
const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: ManagedEventReassignmentService,
  depsMap: {
    bookingRepository: bookingRepositoryModuleLoader,
    eventTypeRepository: eventTypeRepositoryModuleLoader,
    userRepository: userRepositoryModuleLoader,
    luckyUserService: luckyUserServiceModuleLoader,
  },
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { ManagedEventReassignmentService };

