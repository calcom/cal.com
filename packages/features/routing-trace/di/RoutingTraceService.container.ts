import { createContainer } from "@calcom/features/di/di";

import type { IPendingRoutingTraceRepository } from "../repositories/PendingRoutingTraceRepository.interface";
import { RoutingTraceService } from "../services/RoutingTraceService";
import { moduleLoader as pendingRoutingTraceRepositoryModuleLoader } from "./PendingRoutingTraceRepository.module";

const routingTraceContainer = createContainer();

function getPendingRoutingTraceRepository(): IPendingRoutingTraceRepository {
  pendingRoutingTraceRepositoryModuleLoader.loadModule(routingTraceContainer);
  return routingTraceContainer.get<IPendingRoutingTraceRepository>(
    pendingRoutingTraceRepositoryModuleLoader.token
  );
}

/**
 * Wraps a function with routing trace context.
 * This initializes the RoutingTraceService with all required dependencies
 * and makes it available via RoutingTraceService.current() within the wrapped function.
 */
export function withRoutingTrace<T>(fn: () => T): T {
  return RoutingTraceService.ensure(
    {
      pendingRoutingTraceRepository: getPendingRoutingTraceRepository(),
    },
    fn
  );
}

export { RoutingTraceService };
