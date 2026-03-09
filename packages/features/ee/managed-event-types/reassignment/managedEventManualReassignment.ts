import { prisma } from "@calcom/prisma";

import type { ManagedEventManualReassignmentParams } from "./services/ManagedEventManualReassignmentService";
import { createManagedEventManualReassignmentService } from "./services/container";

/**
 * Entry point for manual managed event reassignment
 *
 * This delegates to the service layer without direct repository knowledge.
 * The container handles all dependency injection.
 */
// TODO: Remove this function with better dependency injection
export async function managedEventManualReassignment(params: ManagedEventManualReassignmentParams) {
  const service = createManagedEventManualReassignmentService(prisma);
  return service.execute(params);
}

export default managedEventManualReassignment;
