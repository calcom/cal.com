import { moduleLoader as destinationCalendarServiceModuleLoader } from "@calcom/features/calendars/di/DestinationCalendarService.module";
import { bindModuleToClassOnToken, createModule, type Container, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as eventTypeRepositoryModuleLoader } from "@calcom/features/di/modules/EventType";
import { moduleLoader as prismaModuleLoader } from "@calcom/features/di/modules/Prisma";
import { moduleLoader as scheduleRepositoryModuleLoader } from "@calcom/features/di/modules/Schedule";
import { DI_TOKENS } from "@calcom/features/di/tokens";
import { moduleLoader as hashedLinkServiceModuleLoader } from "@calcom/features/hashedLink/di/HashedLinkService.module";
import { moduleLoader as membershipRepositoryModuleLoader } from "@calcom/features/users/di/MembershipRepository.module";

import { EventTypeService } from "../service/EventTypeService";

const thisModule = createModule();
const token = DI_TOKENS.EVENT_TYPE_SERVICE;
const moduleToken = DI_TOKENS.EVENT_TYPE_SERVICE_MODULE;

// Defer bindModuleToClassOnToken until loadModule is first called to avoid
// circular-dependency issues where a dependency's moduleLoader is still
// undefined during top-level module evaluation.
let _loadModule: ((container: Container) => void) | null = null;

function ensureModuleBound() {
  if (!_loadModule) {
    _loadModule = bindModuleToClassOnToken({
      module: thisModule,
      moduleToken,
      token,
      classs: EventTypeService,
      depsMap: {
        eventTypeRepository: eventTypeRepositoryModuleLoader,
        prisma: prismaModuleLoader,
        membershipRepository: membershipRepositoryModuleLoader,
        scheduleRepository: scheduleRepositoryModuleLoader,
        hashedLinkService: hashedLinkServiceModuleLoader,
        destinationCalendarService: destinationCalendarServiceModuleLoader,
      },
    });
  }
  return _loadModule;
}

export const moduleLoader = {
  token,
  loadModule: (container: Container) => ensureModuleBound()(container),
} satisfies ModuleLoader;

export type { EventTypeService };
export type { EventTypeBrandingData } from "../service/EventTypeService";
