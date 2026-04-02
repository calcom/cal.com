import { AssignmentReasonRepository } from "@calcom/features/assignment-reason/repositories/AssignmentReasonRepository";
import { createContainer } from "@calcom/features/di/di";
import prisma from "@calcom/prisma";
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
 * Creates a RoutingTraceService instance with all required repositories.
 * Use this for processing pending traces during booking creation.
 */
export function getRoutingTraceService(): RoutingTraceService {
  return new RoutingTraceService({
    pendingRoutingTraceRepository: getPendingRoutingTraceRepository(),
    routingTraceRepository: getRoutingTraceRepository(),
    assignmentReasonRepository: new AssignmentReasonRepository(prisma),
  });
}

export { RoutingTraceService };
