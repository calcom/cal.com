import { createContainer } from "@calcom/features/di/di";

import type { IPendingRoutingTraceRepository } from "../repositories/PendingRoutingTraceRepository.interface";
import type { IRoutingTraceRepository } from "../repositories/RoutingTraceRepository.interface";
import { RoutingTraceService } from "../services/RoutingTraceService";
import { moduleLoader as pendingRoutingTraceRepositoryModuleLoader } from "./PendingRoutingTraceRepository.module";
import { moduleLoader as routingTraceRepositoryModuleLoader } from "./RoutingTraceRepository.module";

const routingTraceContainer = createContainer();

function getPendingRoutingTraceRepository(): IPendingRoutingTraceRepository {
  pendingRoutingTraceRepositoryModuleLoader.loadModule(routingTraceContainer);
  return routingTraceContainer.get<IPendingRoutingTraceRepository>(
    pendingRoutingTraceRepositoryModuleLoader.token
  );
}

function getRoutingTraceRepository(): IRoutingTraceRepository {
  routingTraceRepositoryModuleLoader.loadModule(routingTraceContainer);
  return routingTraceContainer.get<IRoutingTraceRepository>(routingTraceRepositoryModuleLoader.token);
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

/**
 * Creates a RoutingTraceService instance with both repositories.
 * Use this for processing pending traces during booking creation.
 */
export function getRoutingTraceService(): RoutingTraceService {
  return new RoutingTraceService({
    pendingRoutingTraceRepository: getPendingRoutingTraceRepository(),
    routingTraceRepository: getRoutingTraceRepository(),
  });
}

export { RoutingTraceService };
