import { withReporting } from "@calcom/lib/sentryWrapper";
import prisma from "@calcom/prisma";
import { AssignmentReasonEnum } from "@calcom/prisma/enums";

export enum ManagedEventReassignmentType {
  MANUAL = "manual",
  AUTO = "auto",
}

/**
 * Records assignment reasons for managed event reassignments
 * 
 * This is separate from Round Robin's AssignmentReasonRecorder to maintain
 * clear separation of concerns between different scheduling types.
 */
export default class ManagedEventAssignmentReasonRecorder {
  /**
   * Record a managed event reassignment reason
   * 
   * @param newBookingId - The ID of the NEW booking created during reassignment
   * @param reassignById - The ID of the user who performed the reassignment
   * @param reassignReason - Optional reason for the reassignment
   * @param reassignmentType - Whether this was manual or automatic reassignment
   */
  static managedEventReassignment = withReporting(
    ManagedEventAssignmentReasonRecorder._managedEventReassignment,
    "ManagedEventAssignmentReasonRecorder.managedEventReassignment"
  );

  static async _managedEventReassignment({
    newBookingId,
    reassignById,
    reassignReason,
    reassignmentType,
  }: {
    newBookingId: number;
    reassignById: number;
    reassignReason?: string;
    reassignmentType: ManagedEventReassignmentType;
  }) {
    const reassignedBy = await prisma.user.findUnique({
      where: {
        id: reassignById,
      },
      select: {
        username: true,
      },
    });

    // Use REASSIGNED for manual, RR_REASSIGNED for auto (similar to Round Robin)
    const reasonEnum =
      reassignmentType === ManagedEventReassignmentType.MANUAL
        ? AssignmentReasonEnum.REASSIGNED
        : AssignmentReasonEnum.RR_REASSIGNED;

    const reassignmentTypeLabel =
      reassignmentType === ManagedEventReassignmentType.AUTO ? "Auto-reassigned" : "Reassigned";

    const reasonString = `${reassignmentTypeLabel} by: ${reassignedBy?.username || "team member"}${
      reassignReason ? `. Reason: ${reassignReason}` : ""
    }`;

    await prisma.assignmentReason.create({
      data: {
        bookingId: newBookingId,
        reasonEnum,
        reasonString,
      },
    });

    return {
      reasonEnum,
      reasonString,
    };
  }
}

