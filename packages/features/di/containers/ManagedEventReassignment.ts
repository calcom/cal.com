import { createContainer } from "../di";
import { moduleLoader as managedEventReassignmentServiceModuleLoader } from "../modules/ManagedEventReassignment";

const container = createContainer();

export function getManagedEventReassignmentService() {
  managedEventReassignmentServiceModuleLoader.loadModule(container);
  return container.get<ManagedEventReassignmentService>(managedEventReassignmentServiceModuleLoader.token);
}
