import { z } from "zod";

import { AuditActionServiceHelper } from "../actions/AuditActionServiceHelper";
import { AttendeeAddedAuditActionService } from "../actions/AttendeeAddedAuditActionService";
import { AttendeeNoShowUpdatedAuditActionService } from "../actions/AttendeeNoShowUpdatedAuditActionService";
import { AttendeeRemovedAuditActionService } from "../actions/AttendeeRemovedAuditActionService";
import { CancelledAuditActionService } from "../actions/CancelledAuditActionService";
import { CreatedAuditActionService } from "../actions/CreatedAuditActionService";
import { HostNoShowUpdatedAuditActionService } from "../actions/HostNoShowUpdatedAuditActionService";
import { LocationChangedAuditActionService } from "../actions/LocationChangedAuditActionService";
import { ReassignmentAuditActionService } from "../actions/ReassignmentAuditActionService";
import { RejectedAuditActionService } from "../actions/RejectedAuditActionService";
import { RescheduleRequestedAuditActionService } from "../actions/RescheduleRequestedAuditActionService";
import { RescheduledAuditActionService } from "../actions/RescheduledAuditActionService";
import { StatusChangeAuditActionService } from "../actions/StatusChangeAuditActionService";

const auditHelper = new AuditActionServiceHelper();
const createdService = new CreatedAuditActionService(auditHelper);
const cancelledService = new CancelledAuditActionService(auditHelper);
const rejectedService = new RejectedAuditActionService(auditHelper);
const rescheduledService = new RescheduledAuditActionService(auditHelper);
const rescheduleRequestedService = new RescheduleRequestedAuditActionService(auditHelper);
const attendeeAddedService = new AttendeeAddedAuditActionService(auditHelper);
const attendeeRemovedService = new AttendeeRemovedAuditActionService(auditHelper);
const reassignmentService = new ReassignmentAuditActionService(auditHelper);
const locationChangedService = new LocationChangedAuditActionService(auditHelper);
const hostNoShowUpdatedService = new HostNoShowUpdatedAuditActionService(auditHelper);
const attendeeNoShowUpdatedService = new AttendeeNoShowUpdatedAuditActionService(auditHelper);
const statusChangeService = new StatusChangeAuditActionService(auditHelper);

/**
 * Union of all audit data schemas for repository validation
 * Used to validate audit data at write time
 */
export const BookingAuditDataSchema = z.union([
    createdService.schema,
    cancelledService.schema,
    rejectedService.schema,
    rescheduledService.schema,
    rescheduleRequestedService.schema,
    attendeeAddedService.schema,
    attendeeRemovedService.schema,
    reassignmentService.schema,
    locationChangedService.schema,
    hostNoShowUpdatedService.schema,
    attendeeNoShowUpdatedService.schema,
    statusChangeService.schema,
]);

