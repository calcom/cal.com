import type { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import type { IAuditActionService } from "../actions/IAuditActionService";
import type { BookingAuditAction } from "../repository/IBookingAuditRepository";

// Import all action services
import { CreatedAuditActionService, type CreatedAuditData } from "../actions/CreatedAuditActionService";
import { CancelledAuditActionService, type CancelledAuditData } from "../actions/CancelledAuditActionService";
import { RescheduledAuditActionService, type RescheduledAuditData } from "../actions/RescheduledAuditActionService";
import { AcceptedAuditActionService, type AcceptedAuditData } from "../actions/AcceptedAuditActionService";
import { RescheduleRequestedAuditActionService, type RescheduleRequestedAuditData } from "../actions/RescheduleRequestedAuditActionService";
import { AttendeeAddedAuditActionService, type AttendeeAddedAuditData } from "../actions/AttendeeAddedAuditActionService";
import { HostNoShowUpdatedAuditActionService, type HostNoShowUpdatedAuditData } from "../actions/HostNoShowUpdatedAuditActionService";
import { RejectedAuditActionService, type RejectedAuditData } from "../actions/RejectedAuditActionService";
import { AttendeeRemovedAuditActionService, type AttendeeRemovedAuditData } from "../actions/AttendeeRemovedAuditActionService";
import { ReassignmentAuditActionService, type ReassignmentAuditData } from "../actions/ReassignmentAuditActionService";
import { LocationChangedAuditActionService, type LocationChangedAuditData } from "../actions/LocationChangedAuditActionService";
import { AttendeeNoShowUpdatedAuditActionService, type AttendeeNoShowUpdatedAuditData } from "../actions/AttendeeNoShowUpdatedAuditActionService";
import { SeatBookedAuditActionService, type SeatBookedAuditData } from "../actions/SeatBookedAuditActionService";
import { SeatRescheduledAuditActionService, type SeatRescheduledAuditData } from "../actions/SeatRescheduledAuditActionService";

/**
 * Union type for all audit action data types
 * Used for type-safe handling of action-specific data
 */
export type AuditActionData =
    | CreatedAuditData
    | CancelledAuditData
    | RescheduledAuditData
    | AcceptedAuditData
    | RescheduleRequestedAuditData
    | AttendeeAddedAuditData
    | HostNoShowUpdatedAuditData
    | RejectedAuditData
    | AttendeeRemovedAuditData
    | ReassignmentAuditData
    | LocationChangedAuditData
    | AttendeeNoShowUpdatedAuditData
    | SeatBookedAuditData
    | SeatRescheduledAuditData;

/**
 * BookingAuditActionServiceRegistry
 * 
 * Centralized registry for all booking audit action services.
 * Provides a single source of truth for action service mapping and eliminates
 * code duplication between consumer and viewer services.
 */
interface BookingAuditActionServiceRegistryDeps {
    userRepository: UserRepository;
}

export class BookingAuditActionServiceRegistry {
    private readonly actionServices: Map<BookingAuditAction, IAuditActionService>;

    constructor(private deps: BookingAuditActionServiceRegistryDeps) {
        const services: Array<[BookingAuditAction, IAuditActionService]> = [
            ["CREATED", new CreatedAuditActionService()],
            ["CANCELLED", new CancelledAuditActionService()],
            ["RESCHEDULED", new RescheduledAuditActionService()],
            ["ACCEPTED", new AcceptedAuditActionService()],
            ["RESCHEDULE_REQUESTED", new RescheduleRequestedAuditActionService()],
            ["ATTENDEE_ADDED", new AttendeeAddedAuditActionService()],
            ["HOST_NO_SHOW_UPDATED", new HostNoShowUpdatedAuditActionService()],
            ["REJECTED", new RejectedAuditActionService()],
            ["ATTENDEE_REMOVED", new AttendeeRemovedAuditActionService()],
            ["REASSIGNMENT", new ReassignmentAuditActionService(deps.userRepository)],
            ["LOCATION_CHANGED", new LocationChangedAuditActionService()],
            ["ATTENDEE_NO_SHOW_UPDATED", new AttendeeNoShowUpdatedAuditActionService()],
            ["SEAT_BOOKED", new SeatBookedAuditActionService()],
            ["SEAT_RESCHEDULED", new SeatRescheduledAuditActionService()],
        ];
        this.actionServices = new Map(services);
    }

    /**
     * Get Action Service - Returns the appropriate action service for the given action type
     * 
     * @param action - The booking audit action type
     * @returns The corresponding action service instance with proper typing
     * @throws Error if no service is found for the action
     */
    getActionService(action: BookingAuditAction): IAuditActionService {
        const service = this.actionServices.get(action);
        if (!service) {
            throw new Error(`No action service found for: ${action}`);
        }
        return service;
    }
}
