import { withReporting } from "@calcom/lib/sentryWrapper";
import { AssignmentReasonEnum } from "@calcom/prisma/enums";
import type { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import type { AssignmentReasonRepository } from "@calcom/features/assignment-reason/repositories/AssignmentReasonRepository";

export enum ManagedEventReassignmentType {
  MANUAL = "manual",
  AUTO = "auto",
}

interface ManagedEventAssignmentReasonServiceDeps {
  userRepository: UserRepository;
  assignmentReasonRepository: AssignmentReasonRepository;
}

/**
 * Service for recording managed event assignment reasons
 * Uses constructor injection for dependencies (no direct repository instantiation)
 */
export class ManagedEventAssignmentReasonService {
  private readonly userRepository: UserRepository;
  private readonly assignmentReasonRepository: AssignmentReasonRepository;

  constructor(deps: ManagedEventAssignmentReasonServiceDeps) {
    this.userRepository = deps.userRepository;
    this.assignmentReasonRepository = deps.assignmentReasonRepository;
  }

  /**
   * Record a managed event reassignment reason
   * 
   * @param newBookingId - The ID of the NEW booking created during reassignment
   * @param reassignById - The ID of the user who performed the reassignment
   * @param reassignReason - Optional reason for the reassignment
   * @param reassignmentType - Whether this was manual or automatic reassignment
   */
  recordReassignment = withReporting(
    this._recordReassignment.bind(this),
    "ManagedEventAssignmentReasonService.recordReassignment"
  );

  private async _recordReassignment({
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
    const reassignedBy = await this.userRepository.findByIdWithUsername(reassignById);

    const reasonEnum = AssignmentReasonEnum.REASSIGNED;

    const reassignmentTypeLabel =
      reassignmentType === ManagedEventReassignmentType.AUTO ? "Auto-reassigned" : "Manual-reassigned";

    const reasonString = `${reassignmentTypeLabel} by: ${reassignedBy?.username || "team member"}${
      reassignReason ? `. Reason: ${reassignReason}` : ""
    }`;

    await this.assignmentReasonRepository.createAssignmentReason({
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
