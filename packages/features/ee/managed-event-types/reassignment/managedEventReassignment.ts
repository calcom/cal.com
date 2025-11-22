import { getManagedEventReassignmentService } from "@calcom/features/di/containers/ManagedEventReassignment";

interface ManagedEventReassignmentParams {
  bookingId: number;
  orgId: number | null;
  reassignReason?: string;
  reassignedById: number;
  emailsEnabled?: boolean;
}

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

