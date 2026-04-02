import type { ManagedEventReassignmentService } from "@calcom/features/ee/managed-event-types/reassignment/services/ManagedEventReassignmentService";
import { createContainer } from "../di";
import { moduleLoader as managedEventReassignmentServiceModuleLoader } from "../modules/ManagedEventReassignment";

const container = createContainer();

export function getManagedEventReassignmentService() {
  managedEventReassignmentServiceModuleLoader.loadModule(container);
  return container.get<ManagedEventReassignmentService>(managedEventReassignmentServiceModuleLoader.token);
}
