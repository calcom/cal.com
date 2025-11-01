import { z } from "zod";

import { CreatedAuditActionService } from "../actions/CreatedAuditActionService";
import { CancelledAuditActionService } from "../actions/CancelledAuditActionService";
import { RejectedAuditActionService } from "../actions/RejectedAuditActionService";
import { RescheduledAuditActionService } from "../actions/RescheduledAuditActionService";
import { RescheduleRequestedAuditActionService } from "../actions/RescheduleRequestedAuditActionService";
import { AttendeeAddedAuditActionService } from "../actions/AttendeeAddedAuditActionService";
import { AttendeeRemovedAuditActionService } from "../actions/AttendeeRemovedAuditActionService";
import { ReassignmentAuditActionService } from "../actions/ReassignmentAuditActionService";
import { AssignmentAuditActionService } from "../actions/AssignmentAuditActionService";
import { CancellationReasonUpdatedAuditActionService } from "../actions/CancellationReasonUpdatedAuditActionService";
import { RejectionReasonUpdatedAuditActionService } from "../actions/RejectionReasonUpdatedAuditActionService";
import { LocationChangedAuditActionService } from "../actions/LocationChangedAuditActionService";
import { MeetingUrlUpdatedAuditActionService } from "../actions/MeetingUrlUpdatedAuditActionService";
import { HostNoShowUpdatedAuditActionService } from "../actions/HostNoShowUpdatedAuditActionService";
import { AttendeeNoShowUpdatedAuditActionService } from "../actions/AttendeeNoShowUpdatedAuditActionService";
import { StatusChangeAuditActionService } from "../actions/StatusChangeAuditActionService";

/**
 * Union of all audit data schemas for repository validation
 * Used to validate audit data at write time
 */
export const BookingAuditDataSchema = z.union([
    CreatedAuditActionService.schema,
    CancelledAuditActionService.schema,
    RejectedAuditActionService.schema,
    RescheduledAuditActionService.schema,
    RescheduleRequestedAuditActionService.schema,
    AttendeeAddedAuditActionService.schema,
    AttendeeRemovedAuditActionService.schema,
    ReassignmentAuditActionService.schema,
    AssignmentAuditActionService.schema,
    CancellationReasonUpdatedAuditActionService.schema,
    RejectionReasonUpdatedAuditActionService.schema,
    LocationChangedAuditActionService.schema,
    MeetingUrlUpdatedAuditActionService.schema,
    HostNoShowUpdatedAuditActionService.schema,
    AttendeeNoShowUpdatedAuditActionService.schema,
    StatusChangeAuditActionService.schema,
]);

// Re-export all types
export * from "../actions/CreatedAuditActionService";
export * from "../actions/CancelledAuditActionService";
export * from "../actions/RejectedAuditActionService";
export * from "../actions/RescheduledAuditActionService";
export * from "../actions/RescheduleRequestedAuditActionService";
export * from "../actions/AttendeeAddedAuditActionService";
export * from "../actions/AttendeeRemovedAuditActionService";
export * from "../actions/ReassignmentAuditActionService";
export * from "../actions/AssignmentAuditActionService";
export * from "../actions/CancellationReasonUpdatedAuditActionService";
export * from "../actions/RejectionReasonUpdatedAuditActionService";
export * from "../actions/LocationChangedAuditActionService";
export * from "../actions/MeetingUrlUpdatedAuditActionService";
export * from "../actions/HostNoShowUpdatedAuditActionService";
export * from "../actions/AttendeeNoShowUpdatedAuditActionService";
export * from "../actions/StatusChangeAuditActionService";
