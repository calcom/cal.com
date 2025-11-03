import { z } from "zod";

import { AssignmentAuditActionService } from "../actions/AssignmentAuditActionService";
import { AttendeeAddedAuditActionService } from "../actions/AttendeeAddedAuditActionService";
import { AttendeeNoShowUpdatedAuditActionService } from "../actions/AttendeeNoShowUpdatedAuditActionService";
import { AttendeeRemovedAuditActionService } from "../actions/AttendeeRemovedAuditActionService";
import { CancellationReasonUpdatedAuditActionService } from "../actions/CancellationReasonUpdatedAuditActionService";
import { CancelledAuditActionService } from "../actions/CancelledAuditActionService";
import { CreatedAuditActionService } from "../actions/CreatedAuditActionService";
import { HostNoShowUpdatedAuditActionService } from "../actions/HostNoShowUpdatedAuditActionService";
import { LocationChangedAuditActionService } from "../actions/LocationChangedAuditActionService";
import { MeetingUrlUpdatedAuditActionService } from "../actions/MeetingUrlUpdatedAuditActionService";
import { ReassignmentAuditActionService } from "../actions/ReassignmentAuditActionService";
import { RejectedAuditActionService } from "../actions/RejectedAuditActionService";
import { RejectionReasonUpdatedAuditActionService } from "../actions/RejectionReasonUpdatedAuditActionService";
import { RescheduleRequestedAuditActionService } from "../actions/RescheduleRequestedAuditActionService";
import { RescheduledAuditActionService } from "../actions/RescheduledAuditActionService";
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
export * from "../actions/AssignmentAuditActionService";
export * from "../actions/AttendeeAddedAuditActionService";
export * from "../actions/AttendeeNoShowUpdatedAuditActionService";
export * from "../actions/AttendeeRemovedAuditActionService";
export * from "../actions/CancellationReasonUpdatedAuditActionService";
export * from "../actions/CancelledAuditActionService";
export * from "../actions/CreatedAuditActionService";
export * from "../actions/HostNoShowUpdatedAuditActionService";
export * from "../actions/LocationChangedAuditActionService";
export * from "../actions/MeetingUrlUpdatedAuditActionService";
export * from "../actions/ReassignmentAuditActionService";
export * from "../actions/RejectedAuditActionService";
export * from "../actions/RejectionReasonUpdatedAuditActionService";
export * from "../actions/RescheduleRequestedAuditActionService";
export * from "../actions/RescheduledAuditActionService";
export * from "../actions/StatusChangeAuditActionService";
