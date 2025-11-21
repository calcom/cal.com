import { withReporting } from "@calcom/lib/sentryWrapper";
import { prisma } from "@calcom/prisma";
import { AssignmentReasonEnum } from "@calcom/prisma/enums";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { AssignmentReasonRepository } from "@calcom/features/assignment-reason/repositories/AssignmentReasonRepository";

export enum ManagedEventReassignmentType {
  MANUAL = "manual",
  AUTO = "auto",
}

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
    const userRepository = new UserRepository(prisma);
    const assignmentReasonRepository = new AssignmentReasonRepository(prisma);
    const reassignedBy = await userRepository.findByIdWithUsername(reassignById);

    const reasonEnum = AssignmentReasonEnum.REASSIGNED;

    const reassignmentTypeLabel =
      reassignmentType === ManagedEventReassignmentType.AUTO ? "Auto-reassigned" : "Manual-reassigned";

    const reasonString = `${reassignmentTypeLabel} by: ${reassignedBy?.username || "team member"}${
      reassignReason ? `. Reason: ${reassignReason}` : ""
    }`;

    await assignmentReasonRepository.createAssignmentReason({
      bookingId: newBookingId,
      reasonEnum,
      reasonString,
    });

    return {
      reasonEnum,
      reasonString,
    };
  }
}

