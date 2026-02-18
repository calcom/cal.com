import { getManagedEventReassignmentService } from "@calcom/features/di/containers/ManagedEventReassignment";

interface ManagedEventReassignmentParams {
  bookingId: number;
  orgId: number | null;
  reassignReason?: string;
  reassignedById: number;
  emailsEnabled?: boolean;
}
// TODO: Remove this function with better dependency injection
export async function managedEventReassignment({
  bookingId,
  orgId,
  reassignReason = "Auto-reassigned to another team member",
  reassignedById,
  emailsEnabled = true,
}: ManagedEventReassignmentParams) {
  const service = getManagedEventReassignmentService();

  return await service.executeAutoReassignment({
    bookingId,
    orgId,
    reassignReason,
    reassignedById,
    emailsEnabled,
  });
}

export default managedEventReassignment;
