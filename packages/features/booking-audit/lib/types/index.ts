import { z } from "zod";

import { CreatedAuditActionHelperService } from "../actions/CreatedAuditActionHelperService";
import { CancelledAuditActionHelperService } from "../actions/CancelledAuditActionHelperService";
import { RejectedAuditActionHelperService } from "../actions/RejectedAuditActionHelperService";
import { RescheduledAuditActionHelperService } from "../actions/RescheduledAuditActionHelperService";
import { RescheduleRequestedAuditActionHelperService } from "../actions/RescheduleRequestedAuditActionHelperService";
import { AttendeeAddedAuditActionHelperService } from "../actions/AttendeeAddedAuditActionHelperService";
import { AttendeeRemovedAuditActionHelperService } from "../actions/AttendeeRemovedAuditActionHelperService";
import { ReassignmentAuditActionHelperService } from "../actions/ReassignmentAuditActionHelperService";
import { AssignmentAuditActionHelperService } from "../actions/AssignmentAuditActionHelperService";
import { CancellationReasonUpdatedAuditActionHelperService } from "../actions/CancellationReasonUpdatedAuditActionHelperService";
import { RejectionReasonUpdatedAuditActionHelperService } from "../actions/RejectionReasonUpdatedAuditActionHelperService";
import { LocationChangedAuditActionHelperService } from "../actions/LocationChangedAuditActionHelperService";
import { MeetingUrlUpdatedAuditActionHelperService } from "../actions/MeetingUrlUpdatedAuditActionHelperService";
import { HostNoShowUpdatedAuditActionHelperService } from "../actions/HostNoShowUpdatedAuditActionHelperService";
import { AttendeeNoShowUpdatedAuditActionHelperService } from "../actions/AttendeeNoShowUpdatedAuditActionHelperService";
import { StatusChangeAuditActionHelperService } from "../actions/StatusChangeAuditActionHelperService";

/**
 * Union of all audit data schemas for repository validation
 * Used to validate audit data at write time
 */
export const BookingAuditDataSchema = z.union([
    CreatedAuditActionHelperService.schema,
    CancelledAuditActionHelperService.schema,
    RejectedAuditActionHelperService.schema,
    RescheduledAuditActionHelperService.schema,
    RescheduleRequestedAuditActionHelperService.schema,
    AttendeeAddedAuditActionHelperService.schema,
    AttendeeRemovedAuditActionHelperService.schema,
    ReassignmentAuditActionHelperService.schema,
    AssignmentAuditActionHelperService.schema,
    CancellationReasonUpdatedAuditActionHelperService.schema,
    RejectionReasonUpdatedAuditActionHelperService.schema,
    LocationChangedAuditActionHelperService.schema,
    MeetingUrlUpdatedAuditActionHelperService.schema,
    HostNoShowUpdatedAuditActionHelperService.schema,
    AttendeeNoShowUpdatedAuditActionHelperService.schema,
    StatusChangeAuditActionHelperService.schema,
]);

// Re-export all types
export * from "../actions/CreatedAuditActionHelperService";
export * from "../actions/CancelledAuditActionHelperService";
export * from "../actions/RejectedAuditActionHelperService";
export * from "../actions/RescheduledAuditActionHelperService";
export * from "../actions/RescheduleRequestedAuditActionHelperService";
export * from "../actions/AttendeeAddedAuditActionHelperService";
export * from "../actions/AttendeeRemovedAuditActionHelperService";
export * from "../actions/ReassignmentAuditActionHelperService";
export * from "../actions/AssignmentAuditActionHelperService";
export * from "../actions/CancellationReasonUpdatedAuditActionHelperService";
export * from "../actions/RejectionReasonUpdatedAuditActionHelperService";
export * from "../actions/LocationChangedAuditActionHelperService";
export * from "../actions/MeetingUrlUpdatedAuditActionHelperService";
export * from "../actions/HostNoShowUpdatedAuditActionHelperService";
export * from "../actions/AttendeeNoShowUpdatedAuditActionHelperService";
export * from "../actions/StatusChangeAuditActionHelperService";

