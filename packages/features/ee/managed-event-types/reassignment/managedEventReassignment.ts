import { getManagedEventReassignmentService } from "@calcom/features/di/containers/ManagedEventReassignment";

interface ManagedEventReassignmentParams {
  bookingId: number;
  orgId: number | null;
  reassignReason?: string;
  reassignedById: number;
  emailsEnabled?: boolean;
}


/**
 * Automatic managed event reassignment using Dependency Injection
 * This is now a thin wrapper around ManagedEventReassignmentService
 * 
 * @see ManagedEventReassignmentService for implementation details
 */
export async function managedEventReassignment({
  bookingId,
  orgId,
  reassignReason = "Auto-reassigned to another team member",
  reassignedById,
  emailsEnabled = true,
}: ManagedEventReassignmentParams) {
  // Get service instance via DI container
  const service = getManagedEventReassignmentService();

  // Delegate to service (follows Dependency Inversion Principle)
  return await service.executeAutoReassignment({
    bookingId,
    orgId,
    reassignReason,
    reassignedById,
    emailsEnabled,
  });
}

export default managedEventReassignment;

